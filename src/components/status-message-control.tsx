"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendJobCardStatusMessage } from "@/lib/actions";
import { statusMessageTemplateFields } from "@/lib/status-message-templates";
import { cn, label } from "@/lib/utils";

function SendStatusButton({ sent }: { sent: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "h-9 rounded-lg px-3 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70",
        sent
          ? "bg-[#2f8f4e] text-white hover:bg-[#24763f] focus:ring-[#2f8f4e]"
          : "bg-[#5a173b] text-white hover:bg-[#42102e] focus:ring-[#d97873]",
      )}
    >
      {pending ? "Sending" : sent ? "Sent" : "Send"}
    </button>
  );
}

export function StatusMessageControl({
  jobCardId,
  currentStatus,
  sentStatuses,
  returnTo,
  apiSendingAvailable,
  fallbackLinks,
}: {
  jobCardId: string;
  currentStatus: string;
  sentStatuses: string[];
  returnTo: string;
  apiSendingAvailable: boolean;
  fallbackLinks: Record<string, string>;
}) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const sentSet = useMemo(() => new Set(sentStatuses), [sentStatuses]);
  const action = sendJobCardStatusMessage.bind(null, jobCardId);
  const isSent = sentSet.has(selectedStatus);

  return (
    <form
      action={action}
      onSubmit={() => {
        if (apiSendingAvailable) return;
        const fallbackLink = fallbackLinks[selectedStatus];
        if (fallbackLink) {
          window.open(fallbackLink, "_blank", "noopener,noreferrer");
        }
      }}
      className="flex min-w-[280px] items-center gap-2"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <select
        name="newStatus"
        value={selectedStatus}
        onChange={(event) => setSelectedStatus(event.target.value)}
        className="h-9 min-w-44 rounded-lg border border-[#e2beb8] bg-[#fffaf7] px-2 text-xs font-bold text-[#2f1233] outline-none transition focus:border-[#d97873] focus:ring-2 focus:ring-[#f8cdbf]"
      >
        {statusMessageTemplateFields.map((status) => (
          <option key={status.status} value={status.status}>
            {label(status.status)}
          </option>
        ))}
      </select>
      <SendStatusButton sent={isSent} />
    </form>
  );
}
