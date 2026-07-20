import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button, Card, CardBody, CardHeader, DataTable, PageHeader, SearchBar } from "@/components/ui";
import { deletePayment } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const [user, payments] = await Promise.all([
    requireUser(),
    prisma.payment.findMany({
      where: q
        ? {
            OR: [
              { invoice: { invoiceNumber: { contains: q, mode: "insensitive" } } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
              { customer: { mobile: { contains: q } } },
              { referenceNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { invoice: true, customer: true, collectedBy: true },
      orderBy: { paymentDate: "desc" },
    }),
  ]);
  const canDelete = user.role === "ADMIN";

  return (
    <div className="grid gap-6">
      <PageHeader title="Payments" action={<Button href="/payments/new">Record payment</Button>} />
      <Card>
        <CardHeader title="Payment History" action={<SearchBar defaultValue={q} placeholder="Search invoice, customer, reference" />} />
        <CardBody>
          <DataTable
            headers={["Date", "Invoice", "Customer", "Amount", "Mode", "Collected By", "Action"]}
            empty="No payments found."
            rows={payments.map((payment) => [
              formatDate(payment.paymentDate),
              payment.invoice.invoiceNumber,
              payment.customer.name,
              formatMoney(payment.amount),
              payment.mode,
              payment.collectedBy?.name ?? "-",
              <div key="actions" className="flex flex-wrap items-center gap-2">
                <Link href={`/payments/${payment.id}`} className="font-bold text-[#5a173b] hover:underline">
                  View
                </Link>
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
              </div>,
            ])}
          />
        </CardBody>
      </Card>
    </div>
  );
}
