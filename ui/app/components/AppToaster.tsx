"use client";

import { Toaster } from "react-hot-toast";

// Renders custom toast cards (see components/toast.tsx). Card styling lives on
// each toast, so the react-hot-toast wrapper stays minimal.
export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      gutter={10}
      toastOptions={{ duration: 4000 }}
    />
  );
}
