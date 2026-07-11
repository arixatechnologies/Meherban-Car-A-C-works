import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

type WebhookStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: { title?: string; message?: string }[];
};

function extractStatuses(payload: unknown): WebhookStatus[] {
  if (!payload || typeof payload !== "object" || !("entry" in payload) || !Array.isArray(payload.entry)) {
    return [];
  }

  return payload.entry.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object" || !("changes" in entry) || !Array.isArray(entry.changes)) {
      return [];
    }

    return entry.changes.flatMap((change: unknown) => {
      if (
        !change ||
        typeof change !== "object" ||
        !("value" in change) ||
        !change.value ||
        typeof change.value !== "object" ||
        !("statuses" in change.value) ||
        !Array.isArray(change.value.statuses)
      ) {
        return [];
      }

      return change.value.statuses as WebhookStatus[];
    });
  });
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json().catch(() => null);
    const statuses = extractStatuses(payload);

    for (const status of statuses) {
      if (!status.id || !status.status) continue;

      const timestamp = status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date();
      await prisma.whatsAppLog.updateMany({
        where: { apiMessageId: status.id },
        data: {
          webhookStatus: status.status,
          status:
            status.status === "delivered"
              ? "DELIVERED"
              : status.status === "read"
                ? "READ"
                : status.status === "failed"
                  ? "FAILED"
                  : undefined,
          deliveredAt: status.status === "delivered" ? timestamp : undefined,
          readAt: status.status === "read" ? timestamp : undefined,
          failedAt: status.status === "failed" ? timestamp : undefined,
          errorMessage: status.errors?.[0]?.message || status.errors?.[0]?.title,
        },
      });
    }

    return Response.json({ received: true, statuses: statuses.length });
  } catch (error) {
    console.error("[whatsapp-webhook]", error);
    return Response.json({ received: false, error: "Webhook processing failed." }, { status: 500 });
  }
}
