import { WhatsAppIcon } from "@/components/action-icons";
import { CopyButton } from "@/components/copy-button";
import { PAGE_SIZE, Pagination, parsePageParam } from "@/components/pagination";
import { Badge, Button, Card, CardBody, CardHeader, DataTable, PageHeader, SearchBar } from "@/components/ui";
import { retryWhatsAppLog } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SettingsWhatsAppLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const requestedPage = parsePageParam(params.page);
  const logWhere = q
    ? {
        OR: [
          { mobileNumber: { contains: q } },
          { customer: { name: { contains: q, mode: "insensitive" as const } } },
          { apiMessageId: { contains: q, mode: "insensitive" as const } },
          { messageBody: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;
  const totalItems = await prisma.whatsAppLog.count({ where: logWhere });
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const logs = await prisma.whatsAppLog.findMany({
    where: logWhere,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="WhatsApp Logs"
        description="Message attempts, API replies, and fallback actions."
        action={<Button href="/settings" variant="secondary">Back to Settings</Button>}
      />
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
                <Button
                  href={createWhatsAppLink(log.mobileNumber, log.messageBody)}
                  variant="secondary"
                  className="border-[#9bd7ad] bg-[#e8f8ed] text-[#128c3a] hover:bg-[#d8f2df]"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Open
                </Button>
                <form action={retryWhatsAppLog.bind(null, log.id)}>
                  <Button type="submit" variant="secondary">Retry API</Button>
                </form>
              </div>,
            ])}
          />
          <div className="mt-4">
            <Pagination
              basePath="/settings/whatsapp-logs"
              currentPage={currentPage}
              totalItems={totalItems}
              query={{ q: q || undefined }}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
