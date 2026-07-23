"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { WarningCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";

type ConfirmActionProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
};

export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
}: ConfirmActionProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="confirm-overlay-v2" />
        <AlertDialog.Content className="confirm-dialog-v2">
          <span className={`confirm-icon-v2${destructive ? " is-danger" : ""}`}>
            <WarningCircle size={22} weight="fill" />
          </span>
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{description}</AlertDialog.Description>
          <div className="confirm-actions-v2">
            <AlertDialog.Cancel asChild>
              <button type="button" className="ghost-button">
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                className={destructive ? "danger-button-v2" : "primary-button"}
                onClick={() => void onConfirm()}
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
