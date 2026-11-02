"use client";

import { useState } from "react";
import { CalendarPlus, Check, Download, Link2, Printer } from "lucide-react";
import { buttonClass } from "./ui";

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CopyLinkButton({ label = "Copy link" }: { label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("default", "sm")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt("Copy this link:", window.location.href);
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

export function PrintButton() {
  return (
    <button type="button" className={buttonClass("default", "sm")} onClick={() => window.print()}>
      <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Print
    </button>
  );
}

export function DownloadButton({
  label,
  filename,
  mime,
  build,
  icon = "download",
  testId,
}: {
  label: string;
  filename: string;
  mime: string;
  build: () => string;
  icon?: "download" | "calendar";
  testId?: string;
}) {
  const Icon = icon === "calendar" ? CalendarPlus : Download;
  return (
    <button type="button" data-testid={testId} className={buttonClass("default", "sm")} onClick={() => downloadText(filename, build(), mime)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
    </button>
  );
}
