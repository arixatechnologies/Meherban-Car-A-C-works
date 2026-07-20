import { Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge, Card, CardBody, CardHeader, DetailGrid, DetailItem, PageHeader } from "@/components/ui";
import { deletePayment } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
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
  const [user, payment] = await Promise.all([
    requireUser(),
    prisma.payment.findUnique({
      where: { id },
      include: { invoice: true, customer: true, collectedBy: true },
    }),
  ]);

  if (!payment) notFound();

  const canDelete = user.role === "ADMIN";

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Payment ${formatMoney(payment.amount)}`}
        description={formatDate(payment.paymentDate)}
        action={
          <form action={deletePayment.bind(null, payment.id)}>
            <ConfirmSubmitButton
              confirmMessage="Delete this payment? Invoice paid amount and balance will be recalculated."
              disabled={!canDelete}
              disabledReason="Only admin can delete payments."
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </ConfirmSubmitButton>
          </form>
        }
      />
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
