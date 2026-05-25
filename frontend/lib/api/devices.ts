import { apiFetch } from "./client";

export type ApiDevice = {
  id: number;
  uuid: string;
  name: string;
  type: string | null;
  os: string | null;
  mac_address: string | null;
  serial_number: string | null;
  status: string;
  last_seen_at: string | null;
  users?: Array<{ id: number; name: string; email: string; pivot?: { is_primary: boolean } }>;
  registered_by?: { id: number; name: string } | null;
};

export async function fetchDevices(page = 1): Promise<{
  data: ApiDevice[];
  meta?: { total: number };
}> {
  return apiFetch(`/api/v1/devices?page=${page}`);
}

export async function createDevice(payload: {
  name: string;
  type?: string;
  os?: string;
  user_ids?: number[];
}): Promise<{ data: ApiDevice }> {
  return apiFetch("/api/v1/devices", { method: "POST", json: payload });
}

export async function updateDevice(
  id: number,
  payload: { name?: string; status?: string; user_ids?: number[] },
): Promise<{ data: ApiDevice }> {
  return apiFetch(`/api/v1/devices/${id}`, { method: "PUT", json: payload });
}
