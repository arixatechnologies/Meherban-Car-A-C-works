"use client";

import { useState, type ReactNode } from "react";
import { PdfDownloadIcon } from "@/components/action-icons";
import { LoadingOverlay } from "@/components/loading-overlay";
import { cn } from "@/lib/utils";

function filenameFromDisposition(value: string | null) {
  if (!value) return "";

  const encodedMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1].replaceAll('"', ""));
  }

  const quotedMatch = value.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1];

  const plainMatch = value.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() ?? "";
}

function fallbackFilename(href: string) {
  const cleanPath = href.split("?")[0].replace(/\/$/, "");
  const name = cleanPath.split("/").filter(Boolean).slice(-2, -1)[0] || "document";
  return `${name}.pdf`;
}

export function PdfDownloadButton({
  href,
  children = "Download PDF",
  className,
  title = "Download PDF",
  compact = false,
}: {
  href: string;
  children?: ReactNode;
  className?: string;
  title?: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const isLoading = status === "loading";

  async function handleDownload() {
    if (isLoading) return;

    setStatus("loading");
    try {
      const response = await fetch(href, {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || "PDF could not be generated right now.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filenameFromDisposition(response.headers.get("content-disposition")) || fallbackFilename(href);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);

      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 2_500);
    } catch (error) {
      setStatus("idle");
      window.alert(error instanceof Error ? error.message : "PDF could not be generated right now. Please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label={isLoading ? "Preparing PDF" : title}
        title={isLoading ? "Preparing PDF..." : title}
        className={cn("disabled:cursor-wait disabled:opacity-75", className)}
      >
        <PdfDownloadIcon />
        {compact ? null : isLoading ? "Preparing PDF..." : status === "done" ? "Downloaded" : children}
      </button>

      {isLoading ? <LoadingOverlay label="Preparing PDF..." /> : null}
    </>
  );
}
