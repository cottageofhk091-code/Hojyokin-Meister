"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function InfoModal({
  title,
  kicker,
  open,
  onClose,
  children,
}: {
  title: string;
  kicker: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#0F172A]/70 backdrop-blur-[2px]"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative z-10 flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[24px] border border-[#F59E0B]/35 bg-[#fbfaf7] shadow-[0_24px_64px_rgba(15,23,42,0.4)] sm:rounded-[24px]"
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FDE68A]" />
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-accent">
              {kicker}
            </p>
            <h2
              id={headingId}
              className="mt-1 text-[20px] font-extrabold tracking-tight text-brand sm:text-[24px]"
            >
              {title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand hover:bg-[#0F172A]/5"
            aria-label="モーダルを閉じる"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 pt-4 sm:px-7 sm:pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
