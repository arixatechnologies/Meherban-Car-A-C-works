import { PaymentForm } from "@/components/forms";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const selectedInvoiceId = (await searchParams).invoiceId;
  const invoices = await prisma.invoice.findMany({
    where: { paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  const selectedInvoice = selectedInvoiceId
    ? await prisma.invoice.findUnique({ where: { id: selectedInvoiceId }, include: { customer: true } })
    : null;

  const invoiceOptions = selectedInvoice && !invoices.some((invoice) => invoice.id === selectedInvoice.id)
    ? [selectedInvoice, ...invoices]
    : invoices;

  return (
    <div className="grid gap-6">
      <PageHeader title="Record Payment" />
      <Card>
        <CardHeader title="Payment details" />
        <CardBody>
          <PaymentForm invoices={invoiceOptions} selectedInvoiceId={selectedInvoiceId} />
        </CardBody>
      </Card>
    </div>
  );
}
