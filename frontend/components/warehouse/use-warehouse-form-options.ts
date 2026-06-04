"use client";

import { useEffect, useState } from "react";
import { listProjects, type ProjectSummary } from "@/lib/api/projects";
import {
  getLocationTree,
  listDoorTypes,
  listWarehouseItems,
  type DoorType,
  type WarehouseItem,
  type WarehouseLocationTree,
} from "@/lib/api/warehouse";

export function useWarehouseFormOptions(enabled = true) {
  const [loading, setLoading] = useState(true);
  const [locationTree, setLocationTree] = useState<WarehouseLocationTree[]>([]);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [doorTypes, setDoorTypes] = useState<DoorType[]>([]);

  useEffect(() => {
    if (!enabled) return;

    setLoading(true);
    Promise.all([
      getLocationTree(),
      listWarehouseItems(),
      listProjects({ per_page: 100 }),
      listDoorTypes(),
    ])
      .then(([treeRes, itemsRes, projectsRes, doorTypesRes]) => {
        setLocationTree(treeRes.data);
        setItems(itemsRes);
        setProjects(projectsRes.data);
        setDoorTypes(doorTypesRes.data);
      })
      .catch(() => {
        setLocationTree([]);
        setItems([]);
        setProjects([]);
        setDoorTypes([]);
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  return { loading, locationTree, items, projects, doorTypes };
}
