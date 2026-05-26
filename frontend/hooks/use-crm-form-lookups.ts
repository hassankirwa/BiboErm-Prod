"use client";

import { useEffect, useState } from "react";
import {
  fetchCrmAssignableUsers,
  fetchCrmLookups,
  type CrmAssignableUser,
  type CrmLookups,
} from "@/lib/api/crm/lookups";

export function useCrmFormLookups(options?: { assignableRole?: string }) {
  const [lookups, setLookups] = useState<CrmLookups | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<CrmAssignableUser[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchCrmLookups(),
      fetchCrmAssignableUsers(
        options?.assignableRole ? { role: options.assignableRole } : undefined,
      ),
    ])
      .then(([lookupsRes, usersRes]) => {
        if (cancelled) return;
        setLookups(lookupsRes.data);
        setAssignableUsers(usersRes.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err &&
          typeof err === "object" &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Failed to load CRM options.";
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [options?.assignableRole]);

  return { lookups, assignableUsers, loading, error };
}
