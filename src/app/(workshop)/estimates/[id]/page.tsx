import Link from "next/link";
import { notFound } from "next/navigation";
import { EstimateStatus } from "@/generated/prisma/client";
import { WhatsAppSendForm } from "@/components/forms";
import { WhatsAppActions } from "@/components/whatsapp-actions";
import { Badge, Button, Card, CardBody, CardHeader, DataTable, DetailGrid, DetailItem, PageHeader } from "@/components/ui";
import { sendEstimateReminder, updateEstimateStatus } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { estimateSharedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      jobCard: true,
      serviceAdvisor: true,
      items: true,
      invoices: true,
      whatsappLogs: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });

  if (!estimate) notFound();

  const message = estimateSharedBody({
    customerId: estimate.customerId,
    jobCardId: estimate.jobCardId,
    estimateId: estimate.id,
    customerName: estimate.customer.name,
    mobileNumber: estimate.customer.whatsapp || estimate.customer.mobile,
    vehicleNumber: estimate.vehicle.vehicleNumber,
    estimateNumber: estimate.estimateNumber,
    totalAmount: estimate.totalAmount,
    trackingToken: estimate.jobCard.trackingToken,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={estimate.estimateNumber}
        description={`${estimate.customer.name} - ${estimate.vehicle.vehicleNumber}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button href={`/estimates/${estimate.id}/edit`} variant="secondary">Edit Estimate</Button>
            <Button href={`/estimates/${estimate.id}/print`} variant="secondary">Print</Button>
            <Button href={`/invoices/new?estimateId=${estimate.id}`} variant="secondary">Create Invoice</Button>
          </div>
        }
      />
      <Card>
        <CardHeader title="Estimate Summary" action={<Badge value={estimate.status} />} />
        <CardBody>
          <DetailGrid>
            <DetailItem labelText="Related job card" value={<Link href={`/job-cards/${estimate.jobCardId}`} className="text-teal-700">{estimate.jobCard.jobCardNumber}</Link>} />
            <DetailItem labelText="Customer" value={estimate.customer.name} />
            <DetailItem labelText="Vehicle" value={estimate.vehicle.vehicleNumber} />
            <DetailItem labelText="Date" value={formatDate(estimate.date)} />
            <DetailItem labelText="Valid till" value={formatDate(estimate.validTill)} />
            <DetailItem labelText="Service advisor" value={estimate.serviceAdvisor?.name} />
            <DetailItem labelText="Problem summary" value={estimate.problemSummary} />
            <DetailItem labelText="Discount" value={formatMoney(estimate.discount)} />
            <DetailItem labelText="Grand total" value={formatMoney(estimate.totalAmount)} />
            <DetailItem labelText="Advance received" value={formatMoney(estimate.advanceReceived)} />
            <DetailItem labelText="Balance payable" value={formatMoney(estimate.balanceAmount)} />
          </DetailGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Items" />
        <CardBody>
          <DataTable
            headers={["Description", "Category", "Quantity", "Unit Price", "Amount"]}
            empty="No estimate items."
            rows={estimate.items.map((item) => [
              item.description,
              item.category,
              item.quantity.toString(),
              formatMoney(item.unitPrice),
              formatMoney(item.amount),
            ])}
          />
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Approval Actions" />
          <CardBody className="flex flex-wrap gap-2">
            <form action={updateEstimateStatus.bind(null, estimate.id, EstimateStatus.SHARED)}>
              <Button type="submit" variant="secondary">Mark as Shared</Button>
            </form>
            <form action={updateEstimateStatus.bind(null, estimate.id, EstimateStatus.APPROVED)}>
              <Button type="submit" variant="secondary">Mark as Approved</Button>
            </form>
            <form action={updateEstimateStatus.bind(null, estimate.id, EstimateStatus.REJECTED)}>
              <Button type="submit" variant="secondary">Mark as Rejected</Button>
            </form>
            <form action={sendEstimateReminder.bind(null, estimate.id)}>
              <Button type="submit" variant="secondary">Send Approval Reminder</Button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="WhatsApp Estimate" />
          <CardBody className="grid gap-4">
            <WhatsAppActions mobileNumber={estimate.customer.whatsapp || estimate.customer.mobile} message={message} />
            <WhatsAppSendForm
              mobileNumber={estimate.customer.whatsapp || estimate.customer.mobile}
              messageBody={message}
              messageType="ESTIMATE_SHARED"
              returnTo={`/estimates/${estimate.id}`}
              customerId={estimate.customerId}
              jobCardId={estimate.jobCardId}
              estimateId={estimate.id}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="WhatsApp Logs" />
        <CardBody>
          <DataTable
            headers={["Type", "Method", "Status", "API Message ID", "Time"]}
            empty="No WhatsApp logs."
            rows={estimate.whatsappLogs.map((log) => [
              log.messageType,
              log.sendMethod,
              <Badge key="status" value={log.status} />,
              log.apiMessageId ?? "-",
              formatDate(log.createdAt),
            ])}
          />
        </CardBody>
      </Card>
    </div>
  );
}
