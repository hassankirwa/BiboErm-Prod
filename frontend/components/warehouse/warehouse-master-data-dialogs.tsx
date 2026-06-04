"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WarehouseNativeSelect } from "@/components/warehouse/warehouse-native-select";
import {
  createAccessory,
  createAluminiumProfile,
  createDoorType,
  createRubber,
  type DoorType,
} from "@/lib/api/warehouse";
import { toast } from "sonner";

type DialogKind = "door" | "profile" | "accessory" | "rubber" | null;

type WarehouseMasterDataDialogsProps = {
  kind: DialogKind;
  onClose: () => void;
  onSaved: () => void;
  doorTypes: DoorType[];
};

export function WarehouseMasterDataDialogs({
  kind,
  onClose,
  onSaved,
  doorTypes,
}: WarehouseMasterDataDialogsProps) {
  const [submitting, setSubmitting] = useState(false);
  const [door, setDoor] = useState({ code: "", name: "", section_code: "" });
  const [profile, setProfile] = useState({
    sku: "",
    name: "",
    unit_of_measure: "m",
    profile_family: "",
  });
  const [accessory, setAccessory] = useState({
    sku: "",
    name: "",
    unit_of_measure: "ea",
    door_type_id: "",
  });
  const [rubber, setRubber] = useState({
    sku: "",
    name: "",
    unit_of_measure: "m",
  });

  const handleSave = async () => {
    setSubmitting(true);
    try {
      if (kind === "door") {
        await createDoorType(door);
        toast.success("Door type created.");
      } else if (kind === "profile") {
        await createAluminiumProfile(profile);
        toast.success("Profile created.");
      } else if (kind === "accessory") {
        await createAccessory({
          ...accessory,
          door_type_id: Number(accessory.door_type_id),
        });
        toast.success("Accessory created.");
      } else if (kind === "rubber") {
        await createRubber(rubber);
        toast.success("Rubber item created.");
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "door" && "Add door type"}
            {kind === "profile" && "Add aluminium profile"}
            {kind === "accessory" && "Add accessory"}
            {kind === "rubber" && "Add rubber"}
          </DialogTitle>
        </DialogHeader>
        {kind === "door" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input value={door.code} onChange={(e) => setDoor({ ...door, code: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={door.name} onChange={(e) => setDoor({ ...door, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Section code</Label>
              <Input
                value={door.section_code}
                onChange={(e) => setDoor({ ...door, section_code: e.target.value })}
              />
            </div>
          </div>
        )}
        {kind === "profile" && (
          <div className="space-y-3">
            <Input placeholder="SKU" value={profile.sku} onChange={(e) => setProfile({ ...profile, sku: e.target.value })} />
            <Input placeholder="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Input
              placeholder="Profile family"
              value={profile.profile_family}
              onChange={(e) => setProfile({ ...profile, profile_family: e.target.value })}
            />
            <Input
              placeholder="Unit (m)"
              value={profile.unit_of_measure}
              onChange={(e) => setProfile({ ...profile, unit_of_measure: e.target.value })}
            />
          </div>
        )}
        {kind === "accessory" && (
          <div className="space-y-3">
            <Input placeholder="SKU" value={accessory.sku} onChange={(e) => setAccessory({ ...accessory, sku: e.target.value })} />
            <Input placeholder="Name" value={accessory.name} onChange={(e) => setAccessory({ ...accessory, name: e.target.value })} />
            <WarehouseNativeSelect
              value={accessory.door_type_id}
              onChange={(v) => setAccessory({ ...accessory, door_type_id: v })}
              options={doorTypes.map((d) => ({ value: String(d.id), label: `${d.code} · ${d.name}` }))}
              placeholder="Door type"
            />
            <Input
              placeholder="Unit (ea)"
              value={accessory.unit_of_measure}
              onChange={(e) => setAccessory({ ...accessory, unit_of_measure: e.target.value })}
            />
          </div>
        )}
        {kind === "rubber" && (
          <div className="space-y-3">
            <Input placeholder="SKU" value={rubber.sku} onChange={(e) => setRubber({ ...rubber, sku: e.target.value })} />
            <Input placeholder="Name" value={rubber.name} onChange={(e) => setRubber({ ...rubber, name: e.target.value })} />
            <Input
              placeholder="Unit (m)"
              value={rubber.unit_of_measure}
              onChange={(e) => setRubber({ ...rubber, unit_of_measure: e.target.value })}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
