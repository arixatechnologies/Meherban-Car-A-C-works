import Link from "next/link";
import { notFound } from "next/navigation";
import {
  InspectionForm,
  StatusUpdateForm,
  WhatsAppSendForm,
} from "@/components/forms";
import { WhatsAppActions } from "@/components/whatsapp-actions";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DetailGrid,
  DetailItem,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { markVehicleDelivered, markVehicleReady } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { label } from "@/lib/utils";
import { jobCardCreatedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function JobCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      serviceAdvisor: true,
      assignedTechnician: true,
      inspectionItems: { orderBy: { createdAt: "asc" } },
      serviceObservations: { orderBy: { sortOrder: "asc" } },
      photos: true,
      statusLogs: { include: { updatedBy: true }, orderBy: { createdAt: "desc" } },
      estimates: { orderBy: { createdAt: "desc" } },
      invoices: { include: { payments: true }, orderBy: { createdAt: "desc" } },
      whatsappLogs: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  if (!jobCard) notFound();

  const serviceAdvisorName = jobCard.serviceAdvisorName || jobCard.serviceAdvisor?.name || "Meherban";

  const message = jobCardCreatedBody({
    customerId: jobCard.customerId,
    jobCardId: jobCard.id,
    customerName: jobCard.customer.name,
    mobileNumber: jobCard.customer.whatsapp || jobCard.customer.mobile,
    vehicleNumber: jobCard.vehicle.vehicleNumber,
    jobCardNumber: jobCard.jobCardNumber,
    trackingToken: jobCard.trackingToken,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={jobCard.jobCardNumber}
        description={`${jobCard.customer.name} - ${jobCard.vehicle.vehicleNumber}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button href={`/job-cards/${jobCard.id}/edit`} variant="secondary">Edit</Button>
            <Button href={`/job-cards/${jobCard.id}/print`} variant="secondary">Print</Button>
            <Button href={`/estimates/new?jobCardId=${jobCard.id}`} variant="secondary">Create Estimate</Button>
            <Button href={`/invoices/new?jobCardId=${jobCard.id}`} variant="secondary">Create Invoice</Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader title="Job Card Summary" action={<Badge value={jobCard.status} />} />
          <CardBody>
            <DetailGrid>
              <DetailItem labelText="Date / Time" value={formatDateTime(jobCard.dateTime)} />
              <DetailItem labelText="Customer" value={jobCard.customer.name} />
              <DetailItem labelText="Vehicle" value={jobCard.vehicle.vehicleNumber} />
              <DetailItem labelText="Service advisor" value={serviceAdvisorName} />
              <DetailItem labelText="Technician" value={jobCard.technicianName || jobCard.assignedTechnician?.name} />
              <DetailItem labelText="Bay / lift" value={jobCard.bayNumber} />
              <DetailItem labelText="Expected delivery" value={formatDateTime(jobCard.expectedDeliveryAt)} />
              <DetailItem labelText="Priority" value={<Badge value={jobCard.priority} />} />
              <DetailItem labelText="Tracking token" value={jobCard.trackingToken} />
            </DetailGrid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Actions" />
          <CardBody className="grid gap-4">
            <StatusUpdateForm jobCardId={jobCard.id} currentStatus={jobCard.status} />
            <div className="flex flex-wrap gap-2">
              <form action={markVehicleReady.bind(null, jobCard.id)}>
                <Button type="submit" variant="secondary">Mark Ready</Button>
              </form>
              <form action={markVehicleDelivered.bind(null, jobCard.id)}>
                <Button type="submit" variant="secondary">Mark Delivered</Button>
              </form>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Customer Complaint & Technician Notes" />
        <CardBody>
          <DetailGrid>
            <DetailItem labelText="Complaints" value={[...jobCard.complaints, jobCard.customComplaint].filter(Boolean).join(", ")} />
            <DetailItem labelText="Problem found" value={jobCard.problemFound} />
            <DetailItem labelText="Work suggested" value={jobCard.workSuggested} />
            <DetailItem labelText="Parts required" value={jobCard.partsRequired} />
            <DetailItem labelText="Service recommendation" value={jobCard.serviceRecommendation} />
            <DetailItem labelText="Final QC by" value={jobCard.finalQcBy} />
            <DetailItem labelText="Internal notes" value={jobCard.internalNotes} />
          </DetailGrid>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader title="Spare Parts / Service Observation" />
          <CardBody>
            <DataTable
              headers={["Sr. No.", "Part / Service", "Description", "Qty.", "Unit Price", "Amount"]}
              empty="No service observations added."
              rows={jobCard.serviceObservations.map((item, index) => [
                index + 1,
                item.partService,
                item.description ?? "-",
                item.quantity.toString(),
                formatMoney(item.unitPrice),
                formatMoney(item.amount),
              ])}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Payment Details" />
          <CardBody>
            <DetailGrid>
              <DetailItem labelText="Total amount" value={formatMoney(jobCard.estimatedTotalAmount)} />
              <DetailItem labelText="Payment mode" value={jobCard.paymentMode ? label(jobCard.paymentMode) : "-"} />
              <DetailItem labelText="Advance" value={formatMoney(jobCard.advanceAmount)} />
              <DetailItem labelText="Balance due" value={formatMoney(jobCard.balanceDue)} />
            </DetailGrid>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Inspection Checklist" />
        <CardBody>
          <InspectionForm jobCardId={jobCard.id} items={jobCard.inspectionItems} />
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Status Timeline" />
          <CardBody>
            <DataTable
              headers={["Time", "From", "To", "Updated By", "Remarks"]}
              empty="No status updates."
              rows={jobCard.statusLogs.map((log) => [
                formatDateTime(log.createdAt),
                log.oldStatus ? <Badge key="old" value={log.oldStatus} /> : "-",
                <Badge key="new" value={log.newStatus} />,
                log.updatedBy?.name ?? "-",
                log.remarks ?? "-",
              ])}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Photos" />
          <CardBody>
            {jobCard.photos.length ? (
              <DataTable
                headers={["Type", "Caption", "URL"]}
                empty="No photos."
                rows={jobCard.photos.map((photo) => [photo.type, photo.caption ?? "-", photo.url])}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {["Before service", "During service", "After service"].map((title) => (
                  <div key={title} className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                    {title}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Estimate Details" />
          <CardBody>
            <DataTable
              headers={["Estimate", "Amount", "Advance", "Balance", "Status"]}
              empty="No estimate created."
              rows={jobCard.estimates.map((estimate) => [
                <Link key="no" href={`/estimates/${estimate.id}`} className="font-semibold text-teal-700">
                  {estimate.estimateNumber}
                </Link>,
                formatMoney(estimate.totalAmount),
                formatMoney(estimate.advanceReceived),
                formatMoney(estimate.balanceAmount),
                <Badge key="status" value={estimate.status} />,
              ])}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Invoice & Payment Status" />
          <CardBody>
            <DataTable
              headers={["Invoice", "Total", "Paid", "Balance", "Status"]}
              empty="No invoice generated."
              rows={jobCard.invoices.map((invoice) => [
                <Link key="no" href={`/invoices/${invoice.id}`} className="font-semibold text-teal-700">
                  {invoice.invoiceNumber}
                </Link>,
                formatMoney(invoice.totalAmount),
                formatMoney(invoice.paidAmount),
                formatMoney(invoice.balanceAmount),
                <Badge key="status" value={invoice.paymentStatus} />,
              ])}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="WhatsApp Updates" />
        <CardBody className="grid gap-5">
          <WhatsAppActions mobileNumber={jobCard.customer.whatsapp || jobCard.customer.mobile} message={message} />
          <WhatsAppSendForm
            mobileNumber={jobCard.customer.whatsapp || jobCard.customer.mobile}
            messageBody={message}
            messageType="JOB_CARD_CREATED"
            returnTo={`/job-cards/${jobCard.id}`}
            customerId={jobCard.customerId}
            jobCardId={jobCard.id}
          />
          {jobCard.whatsappLogs.length ? (
            <DataTable
              headers={["Type", "Method", "Status", "API Message ID", "Time"]}
              empty="No WhatsApp logs."
              rows={jobCard.whatsappLogs.map((log) => [
                log.messageType,
                log.sendMethod,
                <Badge key="status" value={log.status} />,
                log.apiMessageId ?? "-",
                formatDateTime(log.createdAt),
              ])}
            />
          ) : (
            <EmptyState title="No WhatsApp logs for this job card." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
