import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PAGE_SIZE, Pagination, parsePageParam } from "@/components/pagination";
import { Button, Card, CardBody, CardHeader, DataTable, PageHeader, SearchBar } from "@/components/ui";
import { deletePayment } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { label, vehicleMakeModel } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaymentInstallment = {
  key: string;
  label: string;
  date: Date;
  amount: ReactNode;
  amountValue: number;
  mode: string;
  collectedBy: string;
};

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
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const requestedPage = parsePageParam(params.page);
  const invoiceWhere = q
    ? {
        OR: [
          { invoiceNumber: { contains: q, mode: "insensitive" as const } },
          { vehicle: { brand: { contains: q, mode: "insensitive" as const } } },
          { vehicle: { model: { contains: q, mode: "insensitive" as const } } },
          { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" as const } } },
          { payments: { some: { referenceNumber: { contains: q, mode: "insensitive" as const } } } },
        ],
      }
    : {
        OR: [
          { payments: { some: {} } },
          { jobCard: { advanceAmount: { gt: 0 } } },
        ],
      };
  const [user, totalItems] = await Promise.all([
    requireUser(),
    prisma.invoice.count({ where: invoiceWhere }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const invoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    include: {
      vehicle: true,
      jobCard: true,
      payments: {
        include: { collectedBy: true },
        orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { updatedAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const canDelete = user.role === "ADMIN";
  const paymentRows = invoices
    .map((invoice) => {
      const installments: PaymentInstallment[] = [];
      const invoiceTotal = Number(invoice.totalAmount);
      const advanceAmount = Number(invoice.jobCard.advanceAmount);

      if (advanceAmount > 0) {
        installments.push({
          key: `advance-${invoice.id}`,
          label: "Advance",
          date: invoice.jobCard.dateTime,
          amount: formatMoney(invoice.jobCard.advanceAmount),
          amountValue: advanceAmount,
          mode: invoice.jobCard.paymentMode ? label(invoice.jobCard.paymentMode) : "-",
          collectedBy: "From Job Card",
        });
      }

      invoice.payments.forEach((payment, index) => {
        installments.push({
          key: payment.id,
          label: `Payment ${index + 1}`,
          date: payment.paymentDate,
          amount: formatMoney(payment.amount),
          amountValue: Number(payment.amount),
          mode: label(payment.mode),
          collectedBy: payment.collectedBy?.name ?? "-",
        });
      });

      const paidTotal = installments.reduce((total, installment) => total + installment.amountValue, 0);
      const latestDate = installments[installments.length - 1]?.date ?? invoice.invoiceDate;

      return {
        key: invoice.id,
        date: latestDate,
        href: `/invoices/${invoice.id}`,
        invoiceNumber: invoice.invoiceNumber,
        vehicleName: vehicleMakeModel(invoice.vehicle.brand, invoice.vehicle.model),
        invoiceTotal: formatMoney(invoice.totalAmount),
        paymentDetails: installments.length ? (
          <div className="min-w-[320px] space-y-2 whitespace-normal">
            {installments.map((installment) => (
              <div key={installment.key} className="rounded-md border border-[#efd9d3] bg-[#fff8f2] px-3 py-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-black text-[#5a173b]">{installment.label}</span>
                  <span className="font-black text-[#2d1030]">{installment.amount}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-[#8d6373]">
                  <span>{formatDate(installment.date)}</span>
                  <span>{installment.mode}</span>
                  <span>{installment.collectedBy}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          "-"
        ),
        paidTotal: formatMoney(paidTotal),
        balance: formatMoney(Math.max(invoiceTotal - paidTotal, 0)),
        action: invoice.payments.length ? (
          <div className="min-w-[150px] space-y-2 whitespace-normal">
            {invoice.payments.map((payment, index) => (
              <form key={payment.id} action={deletePayment.bind(null, payment.id)}>
                <ConfirmSubmitButton
                  confirmMessage={`Delete Payment ${index + 1}? Invoice paid amount and balance will be recalculated.`}
                  disabled={!canDelete}
                  disabledReason="Only admin can delete payments."
                >
                  <Trash2 className="h-4 w-4" />
                  Delete P{index + 1}
                </ConfirmSubmitButton>
              </form>
            ))}
          </div>
        ) : (
          <span className="text-xs font-black text-[#8d6373]">Advance from Job Card</span>
        ),
      };
    })
    .sort((left, right) => right.date.getTime() - left.date.getTime());

  return (
    <div className="grid gap-6">
      <PageHeader title="Payments" action={<Button href="/payments/new">Record payment</Button>} />
      <Card>
        <CardHeader
          title="Payment History"
          action={<SearchBar defaultValue={q} placeholder="Search invoice, car model, vehicle, reference" />}
        />
        <CardBody>
          <DataTable
            headers={[
              "Last Payment",
              "Invoice",
              "Car Make / Model",
              "Invoice Total",
              "Payment Details",
              "Paid Total",
              "Balance Due",
              "Action",
            ]}
            empty="No payments found."
            rows={paymentRows.map((payment) => [
              paymentCellLink(payment.href, formatDate(payment.date)),
              paymentCellLink(
                payment.href,
                <span className="font-black text-[#5a173b] hover:underline">{payment.invoiceNumber}</span>,
              ),
              paymentCellLink(payment.href, payment.vehicleName),
              paymentCellLink(payment.href, payment.invoiceTotal),
              paymentCellLink(payment.href, payment.paymentDetails),
              paymentCellLink(payment.href, payment.paidTotal),
              paymentCellLink(payment.href, payment.balance),
              <div key="actions" className="flex flex-wrap items-center gap-2">
                {payment.action}
              </div>,
            ])}
          />
          <div className="mt-4">
            <Pagination
              basePath="/payments"
              currentPage={currentPage}
              totalItems={totalItems}
              query={{ q: q || undefined }}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
