"use client";

import type { ReactNode } from "react";
import { AlertDialog } from "radix-ui";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger: it takes something out of the room · positive: a happy choice, like buying. */
  tone?: "danger" | "positive";
  onConfirm: () => void;
  onClose: () => void;
};

export const ConfirmDialog = ({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Keep it",
  tone = "danger",
  onConfirm,
  onClose,
}: ConfirmDialogProps) => (
  <AlertDialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="fixed inset-0 z-50 bg-foreground/25 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border-[1.5px] border-border bg-popover p-5 shadow-paper outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95">
        <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
        <AlertDialog.Description asChild>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">{children}</div>
        </AlertDialog.Description>
        <div className="mt-2 flex justify-end gap-2">
          <AlertDialog.Cancel className="h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-muted/40">
            {cancelLabel}
          </AlertDialog.Cancel>
          <AlertDialog.Action
            onClick={onConfirm}
            className={`h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ease-out ${
              tone === "positive"
                ? "bg-sage-deep text-primary-foreground hover:bg-sage-deep/85"
                : "bg-terracotta text-accent-foreground hover:bg-terracotta/85"
            }`}
          >
            {confirmLabel}
          </AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
