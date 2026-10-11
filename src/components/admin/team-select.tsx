"use client";

import { useState } from "react";
import { Select } from "@/components/ui/input";
import { withToast } from "@/components/ui/toast";
import { teamName } from "@/lib/teams";

export function TeamSelect({
  team,
  action,
}: {
  userId: string;
  team: string | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Select
      defaultValue={team ?? ""}
      disabled={pending}
      className="h-9 w-36"
      onChange={async (e) => {
        const fd = new FormData();
        const value = e.target.value;
        fd.set("team", value);
        setPending(true);
        await withToast(() => action(fd), { pending: "Changing the team", done: `Moved to ${teamName(value as "cst")}` });
        setPending(false);
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
