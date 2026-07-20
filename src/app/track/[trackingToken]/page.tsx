import { notFound } from "next/navigation";
import { WhatsAppIcon } from "@/components/action-icons";
import { PdfDownloadButton } from "@/components/pdf-download-button";
import { Badge, Button, Card, CardBody, CardHeader, DataTable, DetailGrid, DetailItem, PageHeader } from "@/components/ui";
import { approveEstimateFromTracking } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { vehicleMakeModel } from "@/lib/utils";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ trackingToken: string }>;
}) {
  const { trackingToken } = await params;
  const [jobCard, setting] = await Promise.all([
    prisma.jobCard.findUnique({
      where: { trackingToken },
      include: {
        customer: true,
        vehicle: true,
        statusLogs: { orderBy: { createdAt: "asc" } },
        estimates: { include: { items: true }, orderBy: { createdAt: "desc" }, take: 1 },
        invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  if (!jobCard) notFound();

  const estimate = jobCard.estimates[0];
  const invoice = jobCard.invoices[0];
  const workshopPhone = setting?.phoneNumber || "7287948037";
  const whatsappNumber = setting?.whatsappNumber || workshopPhone;
  const downloadButtonClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#f1b8b8] bg-[#fff0f0] px-4 text-sm font-bold text-[#c62828] transition hover:bg-[#ffe0e0] focus:outline-none focus:ring-2 focus:ring-[#d97873] focus:ring-offset-2";
  const invoiceReturnAmount = invoice ? Math.max(Number(invoice.paidAmount) - Number(invoice.totalAmount), 0) : 0;
  const estimateReturnAmount = estimate ? Math.max(Number(estimate.advanceReceived) - Number(estimate.totalAmount), 0) : 0;
  const payableLabel =
    invoiceReturnAmount > 0 || (!invoice && estimateReturnAmount > 0) ? "Return Amount" : "Amount payable";
  const payableValue = invoice
    ? formatMoney(invoiceReturnAmount > 0 ? invoiceReturnAmount : invoice.balanceAmount)
    : estimate
      ? formatMoney(estimateReturnAmount > 0 ? estimateReturnAmount : estimate.balanceAmount)
      : "-";
  const estimateSettlementLabel = estimateReturnAmount > 0 ? "Return Amount" : "Balance";
  const estimateSettlementValue = estimate
    ? formatMoney(estimateReturnAmount > 0 ? estimateReturnAmount : estimate.balanceAmount)
    : "-";

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="bg-[#2d1030] px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-bold uppercase tracking-wide text-[#f8cdbf]">
            {setting?.workshopName ?? "Meharban Car A/C Works"}
          </p>
          <h1 className="font-display mt-3 text-4xl font-bold">{jobCard.vehicle.vehicleNumber}</h1>
          <p className="mt-2 font-semibold text-[#eadce9]">{jobCard.jobCardNumber} - {jobCard.customer.name}</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6">
        <PageHeader title="Service Tracking" action={<Badge value={jobCard.status} />} />
        <Card>
          <CardHeader title="Current Status" />
          <CardBody>
            <DetailGrid>
              <DetailItem labelText="Vehicle" value={vehicleMakeModel(jobCard.vehicle.brand, jobCard.vehicle.model)} />
              <DetailItem labelText="Vehicle number" value={jobCard.vehicle.vehicleNumber} />
              <DetailItem labelText="Customer" value={jobCard.customer.name} />
              <DetailItem labelText="Expected delivery" value={formatDateTime(jobCard.expectedDeliveryAt)} />
              <DetailItem labelText="Estimate status" value={estimate ? <Badge value={estimate.status} /> : "Not created"} />
              <DetailItem labelText="Invoice status" value={invoice ? <Badge value={invoice.paymentStatus} /> : "Not generated"} />
              <DetailItem labelText={payableLabel} value={payableValue} />
            </DetailGrid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Status Timeline" />
          <CardBody>
            <DataTable
              headers={["Time", "Status", "Remarks"]}
              empty="No status updates."
              rows={jobCard.statusLogs.map((log) => [
                formatDateTime(log.createdAt),
                <Badge key="status" value={log.newStatus} />,
                log.remarks ?? "-",
              ])}
            />
          </CardBody>
        </Card>

        {estimate ? (
          <Card>
            <CardHeader title="Estimate Approval" action={<Badge value={estimate.status} />} />
            <CardBody className="grid gap-4">
              <DetailGrid>
                <DetailItem labelText="Estimate number" value={estimate.estimateNumber} />
                <DetailItem labelText="Amount" value={formatMoney(estimate.totalAmount)} />
                <DetailItem labelText={estimateSettlementLabel} value={estimateSettlementValue} />
              </DetailGrid>
              <div className="flex flex-wrap gap-2">
                <form action={approveEstimateFromTracking.bind(null, estimate.id, trackingToken)}>
                  <Button type="submit">Approve Estimate</Button>
                </form>
                <PdfDownloadButton
                  href={`/track/${trackingToken}/estimate/download`}
                  className={downloadButtonClass}
                >
                  Estimate Download
                </PdfDownloadButton>
              </div>
            </CardBody>
          </Card>
        ) : null}

        {invoice ? (
          <Card>
            <CardHeader title="Invoice Status" action={<Badge value={invoice.paymentStatus} />} />
            <CardBody>
              <div className="flex flex-wrap gap-2">
                <PdfDownloadButton
                  href={`/track/${trackingToken}/invoice/download`}
                  className={downloadButtonClass}
                >
                  Invoice Download
                </PdfDownloadButton>
              </div>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Workshop Contact" />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Button href={`tel:${workshopPhone}`} variant="secondary">Call Workshop</Button>
              <Button
                href={createWhatsAppLink(whatsappNumber, `Hello Meharban Car A/C Works, I want an update for ${jobCard.jobCardNumber}.`)}
                variant="secondary"
                className="border-[#9bd7ad] bg-[#e8f8ed] text-[#128c3a] hover:bg-[#d8f2df]"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp
              </Button>
              {jobCard.status === "DELIVERED" ? (
                <Button href={`mailto:${setting?.email ?? ""}?subject=Service Feedback ${jobCard.jobCardNumber}`} variant="secondary">
                  Feedback
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
