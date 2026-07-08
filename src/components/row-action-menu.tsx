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
      <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <MoreHorizontal className="h-4 w-4" />
        Action
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
        <Link
          href={previewHref}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Eye className="h-4 w-4" />
          Preview
        </Link>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </form>
      </div>
    </details>
  );
}
