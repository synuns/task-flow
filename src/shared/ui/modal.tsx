import { type PropsWithChildren, type RefObject, useEffect, useId, useRef } from "react";

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  onClose(): void;
  closeDisabled?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
}>;

export function Modal({
  open,
  title,
  onClose,
  closeDisabled = false,
  returnFocusRef,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    const target = dialog?.querySelector<HTMLElement>("[autofocus], button, input, a[href]");
    target?.focus();
    return () => {
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
      (returnFocusRef?.current ?? previousFocus)?.focus();
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  return (
    <dialog
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!closeDisabled) onClose();
      }}
      ref={dialogRef}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}
