"use client";

import { withToast } from "./toast";

/** A form for a server action that shows a status pop-up while it runs and when it's done. */
export function ToastForm({
  action,
  pending,
  done,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action: (formData: FormData) => Promise<unknown>;
  pending: string;
  done: string;
}) {
  return (
    <form
      {...props}
      action={async (formData) => {
        await withToast(() => action(formData), { pending, done });
      }}
    />
  );
}
