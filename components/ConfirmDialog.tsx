"use client";

import type { ReactNode } from "react";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "取消",
  onConfirm,
  onCancel,
  children
}: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2>{title}</h2>
        <p>{description}</p>
        {children ? <div className="dialog-content">{children}</div> : null}
        <div className="dialog-actions">
          <button type="button" className="dialog-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="dialog-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
