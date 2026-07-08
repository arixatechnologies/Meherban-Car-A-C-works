import { notFound } from "next/navigation";
import { Badge, Card, CardBody, CardHeader, DetailGrid, DetailItem, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { invoice: true, customer: true, collectedBy: true },
  });

  if (!payment) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader title={`Payment ${formatMoney(payment.amount)}`} description={formatDate(payment.paymentDate)} />
      <Card>
        <CardHeader title="Payment Details" action={<Badge value={payment.invoice.paymentStatus} />} />
        <CardBody>
          <DetailGrid>
            <DetailItem labelText="Invoice" value={payment.invoice.invoiceNumber} />
            <DetailItem labelText="Customer" value={payment.customer.name} />
            <DetailItem labelText="Amount" value={formatMoney(payment.amount)} />
            <DetailItem labelText="Mode" value={payment.mode} />
            <DetailItem labelText="Reference number" value={payment.referenceNumber} />
            <DetailItem labelText="Collected by" value={payment.collectedBy?.name} />
            <DetailItem labelText="Notes" value={payment.notes} />
          </DetailGrid>
        </CardBody>
      </Card>
    </div>
  );
}
