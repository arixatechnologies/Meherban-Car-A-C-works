"use client";

import { Eye, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";

type DeleteAction = () => Promise<void>;

export function RowActionMenu({
  previewHref,
  whatsappHref,
  deleteAction,
  deleteDisabled = false,
  deleteDisabledReason = "Delete is not available.",
}: {
  previewHref: string;
  whatsappHref: string;
  deleteAction: DeleteAction;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
}) {
  return (
    <details className="relative inline-block text-left">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-[#e7c9c1] bg-[#fff8f2] px-3 text-sm font-bold text-[#4b1737] transition hover:bg-[#f4ded6] [&::-webkit-details-marker]:hidden">
        <MoreHorizontal className="h-4 w-4" />
        Action
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-lg border border-[#e7c9c1] bg-[#fffaf5] shadow-lg">
        <Link
          href={previewHref}
          className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-[#4b1737] hover:bg-[#fff1e8]"
        >
          <Eye className="h-4 w-4" />
          Preview
        </Link>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-[#4b1737] hover:bg-[#fff1e8]"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Sharing
        </a>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (deleteDisabled || !window.confirm("Delete this record permanently?")) {
              event.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            disabled={deleteDisabled}
            title={deleteDisabled ? deleteDisabledReason : "Delete"}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold text-[#9d2f47] hover:bg-[#fde2e2] disabled:cursor-not-allowed disabled:text-[#a88996] disabled:hover:bg-white"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </form>
      </div>
    </details>
  );
}
