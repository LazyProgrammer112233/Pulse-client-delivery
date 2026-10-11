"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";

export function TeamSelect({
  team,
  action,
}: {
  userId: string;
  team: string | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      defaultValue={team ?? ""}
      disabled={pending}
      className="h-9 w-36"
      onChange={(e) => {
        const fd = new FormData();
        fd.set("team", e.target.value);
        start(() => action(fd));
      }}
    >
      <option value="" disabled>
        Not picked
      </option>
      <option value="cst">CST</option>
      <option value="product">Product</option>
      <option value="tech">Tech</option>
    </Select>
  );
}
