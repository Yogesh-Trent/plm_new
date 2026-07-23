"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast: "threadline-toast",
          title: "threadline-toast-title",
          description: "threadline-toast-description",
          actionButton: "threadline-toast-action",
          cancelButton: "threadline-toast-cancel",
          closeButton: "threadline-toast-close",
        },
      }}
    />
  );
}
