import { notFound } from "next/navigation";
import { approveEstimateFromTracking } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { Badge, Button, Card, CardBody, CardHeader, DataTable, DetailGrid, DetailItem, PageHeader } from "@/components/ui";

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
  const workshopPhone = setting?.phoneNumber || "9876543210";
  const whatsappNumber = setting?.whatsappNumber || workshopPhone;

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-200">
            {setting?.workshopName ?? "Meherban Car A/C Works"}
          </p>
          <h1 className="mt-3 text-3xl font-bold">{jobCard.vehicle.vehicleNumber}</h1>
          <p className="mt-2 text-slate-300">{jobCard.jobCardNumber} - {jobCard.customer.name}</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6">
        <PageHeader title="Service Tracking" action={<Badge value={jobCard.status} />} />
        <Card>
          <CardHeader title="Current Status" />
          <CardBody>
            <DetailGrid>
              <DetailItem labelText="Vehicle" value={`${jobCard.vehicle.brand} ${jobCard.vehicle.model}`} />
              <DetailItem labelText="Vehicle number" value={jobCard.vehicle.vehicleNumber} />
              <DetailItem labelText="Customer" value={jobCard.customer.name} />
              <DetailItem labelText="Expected delivery" value={formatDateTime(jobCard.expectedDeliveryAt)} />
              <DetailItem labelText="Estimate status" value={estimate ? <Badge value={estimate.status} /> : "Not created"} />
              <DetailItem labelText="Invoice status" value={invoice ? <Badge value={invoice.paymentStatus} /> : "Not generated"} />
              <DetailItem labelText="Amount payable" value={invoice ? formatMoney(invoice.balanceAmount) : estimate ? formatMoney(estimate.balanceAmount) : "-"} />
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
                <DetailItem labelText="Balance" value={formatMoney(estimate.balanceAmount)} />
              </DetailGrid>
              <div className="flex flex-wrap gap-2">
                <form action={approveEstimateFromTracking.bind(null, estimate.id, trackingToken)}>
                  <Button type="submit">Approve Estimate</Button>
                </form>
                <Button href={`/track/${trackingToken}/estimate`} variant="secondary">Estimate Download</Button>
              </div>
            </CardBody>
          </Card>
        ) : null}

        {invoice ? (
          <Card>
            <CardHeader title="Invoice Status" action={<Badge value={invoice.paymentStatus} />} />
            <CardBody>
              <div className="flex flex-wrap gap-2">
                <Button href={`/track/${trackingToken}/invoice`} variant="secondary">Invoice Download</Button>
              </div>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Workshop Contact" />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Button href={`tel:${workshopPhone}`} variant="secondary">Call Workshop</Button>
              <Button href={createWhatsAppLink(whatsappNumber, `Hello Meherban Car A/C Works, I want an update for ${jobCard.jobCardNumber}.`)} variant="secondary">
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
