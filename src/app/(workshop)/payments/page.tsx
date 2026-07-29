import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button, Card, CardBody, CardHeader, DataTable, PageHeader, SearchBar } from "@/components/ui";
import { deletePayment } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { label } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function paymentCellLink(href: string, children: ReactNode) {
  return (
    <Link
      href={href}
      className="block -mx-4 -my-3 px-4 py-3 text-inherit transition hover:text-[#5a173b]"
    >
      {children}
    </Link>
  );
}

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
      include: { invoice: { include: { jobCard: true } }, customer: true, collectedBy: true },
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
            headers={[
              "Date",
              "Invoice",
              "Customer",
              "Advance Paid",
              "Advance Mode",
              "Remaining Paid",
              "Remaining Mode",
              "Collected By",
              "Action",
            ]}
            empty="No payments found."
            rows={payments.map((payment) => [
              paymentCellLink(`/payments/${payment.id}`, formatDate(payment.paymentDate)),
              paymentCellLink(
                `/payments/${payment.id}`,
                <span className="font-black text-[#5a173b] hover:underline">{payment.invoice.invoiceNumber}</span>,
              ),
              paymentCellLink(`/payments/${payment.id}`, payment.customer.name),
              paymentCellLink(`/payments/${payment.id}`, formatMoney(payment.invoice.jobCard.advanceAmount)),
              paymentCellLink(
                `/payments/${payment.id}`,
                payment.invoice.jobCard.paymentMode ? label(payment.invoice.jobCard.paymentMode) : "-",
              ),
              paymentCellLink(`/payments/${payment.id}`, formatMoney(payment.amount)),
              paymentCellLink(`/payments/${payment.id}`, label(payment.mode)),
              paymentCellLink(`/payments/${payment.id}`, payment.collectedBy?.name ?? "-"),
              <div key="actions" className="flex flex-wrap items-center gap-2">
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
