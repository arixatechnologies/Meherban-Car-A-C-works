import { Badge, Button, Card, CardBody, CardHeader, DataTable, PageHeader, SearchBar } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { retryWhatsAppLog } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function WhatsAppLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const logs = await prisma.whatsAppLog.findMany({
    where: q
      ? {
          OR: [
            { mobileNumber: { contains: q } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { apiMessageId: { contains: q, mode: "insensitive" } },
            { messageBody: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="WhatsApp Logs" />
      <Card>
        <CardHeader title="Message Attempts" action={<SearchBar defaultValue={q} placeholder="Search mobile, customer, API message ID" />} />
        <CardBody>
          <DataTable
            headers={["Customer", "Mobile", "Type", "Method", "API Message ID", "Status", "Sent", "Delivered", "Read", "Error", "Actions"]}
            empty="No WhatsApp logs."
            rows={logs.map((log) => [
              log.customer?.name ?? "-",
              log.mobileNumber,
              log.messageType,
              log.sendMethod,
              log.apiMessageId ?? "-",
              <Badge key="status" value={log.status} />,
              formatDateTime(log.sentAt),
              formatDateTime(log.deliveredAt),
              formatDateTime(log.readAt),
              log.errorMessage ?? "-",
              <div key="actions" className="flex flex-wrap gap-2">
                <CopyButton text={log.messageBody} />
                <Button href={createWhatsAppLink(log.mobileNumber, log.messageBody)} variant="secondary">Open</Button>
                <form action={retryWhatsAppLog.bind(null, log.id)}>
                  <Button type="submit" variant="secondary">Retry API</Button>
                </form>
              </div>,
            ])}
          />
        </CardBody>
      </Card>
    </div>
  );
}
