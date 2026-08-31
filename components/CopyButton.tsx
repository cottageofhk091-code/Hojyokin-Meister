"use client";

import { useState } from "react";

async function writeClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

export function CopyButton({
  value,
  label = "クリップボードにコピー",
  variant = "outline",
}: {
  value: string;
  label?: string;
  variant?: "outline" | "primary";
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await writeClipboard(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`min-h-9 shrink-0 rounded-full px-4 py-2 text-center text-[12px] font-semibold leading-4 sm:text-[13px] ${
        variant === "primary"
          ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B] font-bold text-[#0F172A] hover:from-[#B45309] hover:to-[#D97706]"
          : "border border-line font-medium hover:bg-[#f7f1e6]"
      }`}
    >
      {copied ? "コピーしました" : label}
    </button>
  );
}
