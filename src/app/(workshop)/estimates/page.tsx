import Link from "next/link";
import { RowActionMenu } from "@/components/row-action-menu";
import { Badge, Button, Card, CardBody, CardHeader, DataTable, PageHeader, SearchBar, inputClass } from "@/components/ui";
import { deleteEstimate } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { estimateStatuses } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { label } from "@/lib/utils";
import { createWhatsAppLink, estimateSharedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const canDelete = user.role === "ADMIN";
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const estimates = await prisma.estimate.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { estimateNumber: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
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
      jobCard: true,
      invoices: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Estimates" action={<Button href="/estimates/new">New estimate</Button>} />
      <Card>
        <CardHeader
          title="Estimate Register"
          action={
            <SearchBar defaultValue={q} placeholder="Search estimate, customer, vehicle">
              <select name="status" defaultValue={status} className={inputClass}>
                <option value="">All statuses</option>
                {estimateStatuses.map((item) => (
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
            headers={["Estimate", "Job Card", "Customer", "Vehicle", "Total", "Balance", "Status", "Action"]}
            empty="No estimates found."
            rows={estimates.map((estimate) => {
              const hasLinkedInvoice = estimate.invoices.length > 0;
              const message = estimateSharedBody({
                customerId: estimate.customerId,
                jobCardId: estimate.jobCardId,
                estimateId: estimate.id,
                customerName: estimate.customer.name,
                mobileNumber: estimate.customer.whatsapp || estimate.customer.mobile,
                vehicleNumber: estimate.vehicle.vehicleNumber,
                jobCardNumber: estimate.jobCard.jobCardNumber,
                estimateNumber: estimate.estimateNumber,
                totalAmount: estimate.totalAmount,
                balanceAmount: estimate.balanceAmount,
                trackingToken: estimate.jobCard.trackingToken,
              });

              return [
                <Link key="no" href={`/estimates/${estimate.id}`} className="font-semibold text-teal-700">
                  {estimate.estimateNumber}
                </Link>,
                estimate.jobCard.jobCardNumber,
                estimate.customer.name,
                estimate.vehicle.vehicleNumber,
                formatMoney(estimate.totalAmount),
                formatMoney(estimate.balanceAmount),
                <Badge key="status" value={estimate.status} />,
                <RowActionMenu
                  key="action"
                  previewHref={`/estimates/${estimate.id}/print`}
                  whatsappHref={createWhatsAppLink(estimate.customer.whatsapp || estimate.customer.mobile, message)}
                  deleteAction={deleteEstimate.bind(null, estimate.id)}
                  deleteDisabled={!canDelete || hasLinkedInvoice}
                  deleteDisabledReason={
                    !canDelete ? "Only admin can delete estimates." : "Delete linked invoices first."
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
