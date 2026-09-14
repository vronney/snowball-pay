"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface SheetProps {
  title: string;
  description?: string;
  /** While true (a save is running), Escape, the backdrop and the close button do nothing. */
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scrolling body: the primary action. */
  footer: ReactNode;
}

/**
 * Dashboard v2 sheet (spec §8.3): a bottom sheet on phones, a centered dialog
 * from 769px. Portaled to <body> because the tab wrapper's `.tab-fade-in`
 * keeps a transform, which would trap a fixed overlay inside the tab.
 */
export default function Sheet({ title, description, busy = false, onClose, children, footer }: SheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    busyRef.current = busy;
    onCloseRef.current = onClose;
  });

  const requestClose = () => {
    if (!busyRef.current) onCloseRef.current();
  };

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current.contains(active)) {
        // Focus drifted outside the dialog (e.g. to <body>) — pull it back in
        // rather than letting Tab reach the page behind the sheet.
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && (active === first || active === headingRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-end justify-center bg-txt/50 min-[769px]:items-center min-[769px]:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="flex max-h-[85dvh] w-full flex-col rounded-t-xl bg-surface shadow-float min-[769px]:max-w-md min-[769px]:rounded-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 pb-3 pt-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="text-[17px] font-extrabold tracking-[-0.02em] text-txt outline-none [text-wrap:pretty]"
            >
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-[13px] leading-relaxed text-txt-muted [text-wrap:pretty]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={requestClose}
            disabled={busy}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-txt-muted outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-action disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">{children}</div>
        <div className="shrink-0 border-t border-border px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 min-[769px]:pb-3">
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}
