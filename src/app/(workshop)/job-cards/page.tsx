import Link from "next/link";
import { RowActionMenu } from "@/components/row-action-menu";
import { Badge, Button, Card, CardBody, CardHeader, DataTable, PageHeader, SearchBar, inputClass } from "@/components/ui";
import { deleteJobCard } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { jobCardStatuses } from "@/lib/constants";
import { label } from "@/lib/utils";
import { createWhatsAppLink, jobCardCreatedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function JobCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const canDelete = user.role === "ADMIN";
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const jobCards = await prisma.jobCard.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { jobCardNumber: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
                { customer: { mobile: { contains: q } } },
                { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
        status ? { status: status as never } : {},
      ],
    },
    include: {
      customer: true,
      vehicle: true,
      assignedTechnician: true,
      estimates: { select: { id: true }, take: 1 },
      invoices: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Job Cards" action={<Button href="/job-cards/new">New job card</Button>} />
      <Card>
        <CardHeader
          title="Workshop Job Cards"
          action={
            <SearchBar defaultValue={q} placeholder="Search job card, customer, mobile, vehicle">
              <select name="status" defaultValue={status} className={inputClass}>
                <option value="">All statuses</option>
                {jobCardStatuses.map((item) => (
                  <option key={item} value={item}>
                    {label(item)}
                  </option>
                ))}
              </select>
            </SearchBar>
          }
        />
        <CardBody>
          <DataTable
            headers={["Job Card", "Date / Time", "Customer", "Vehicle", "Technician", "Priority", "Status", "Action"]}
            empty="No job cards found."
            rows={jobCards.map((jobCard) => {
              const hasLinkedRecords = jobCard.estimates.length > 0 || jobCard.invoices.length > 0;
              const message = jobCardCreatedBody({
                customerId: jobCard.customerId,
                jobCardId: jobCard.id,
                customerName: jobCard.customer.name,
                mobileNumber: jobCard.customer.whatsapp || jobCard.customer.mobile,
                vehicleNumber: jobCard.vehicle.vehicleNumber,
                jobCardNumber: jobCard.jobCardNumber,
                trackingToken: jobCard.trackingToken,
              });

              return [
                <Link key="no" href={`/job-cards/${jobCard.id}`} className="font-semibold text-teal-700">
                  {jobCard.jobCardNumber}
                </Link>,
                formatDateTime(jobCard.dateTime),
                jobCard.customer.name,
                jobCard.vehicle.vehicleNumber,
                jobCard.assignedTechnician?.name ?? "-",
                <Badge key="priority" value={jobCard.priority} />,
                <Badge key="status" value={jobCard.status} />,
                <RowActionMenu
                  key="action"
                  previewHref={`/job-cards/${jobCard.id}`}
                  whatsappHref={createWhatsAppLink(jobCard.customer.whatsapp || jobCard.customer.mobile, message)}
                  deleteAction={deleteJobCard.bind(null, jobCard.id)}
                  deleteDisabled={!canDelete || hasLinkedRecords}
                  deleteDisabledReason={
                    !canDelete
                    ? "Only admin can delete job cards."
                      : "Delete linked estimates and invoices first."
                  }
                />,
              ];
            })}
          />
        </CardBody>
      </Card>
    </div>
  );
}
