import { Card, CardBody, CardHeader, DataTable, PageHeader, StatCard, inputClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChartPoint = {
  label: string;
  value: number;
};

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function parseDateInput(value: string | undefined, fallback: Date) {
  if (!value) return fallback;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return fallback;

  return new Date(year, month - 1, day);
}

function dateInputValue(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function monthKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0")].join("-");
}

function monthsBetween(start: Date, end: Date) {
  const months: Date[] = [];
  let cursor = startOfMonth(start);
  const lastMonth = startOfMonth(end);

  while (cursor <= lastMonth) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }

  return months;
}

function daysBetween(start: Date, end: Date) {
  const days: Date[] = [];
  let cursor = startOfDay(start);
  const lastDay = startOfDay(end);

  while (cursor <= lastDay) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

function RevenueBarChart({ title, points, empty }: { title: string; points: ChartPoint[]; empty: string }) {
  const maxValue = Math.max(...points.map((point) => point.value), 0);

  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        {maxValue === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d7a9ad] bg-[#fff3ec] px-5 py-8 text-center text-sm font-semibold text-[#6a3b50]">
            {empty}
          </div>
        ) : (
          <div className="flex min-h-72 items-end gap-3 overflow-x-auto border-l border-b border-[#e7c9c1] px-3 pt-6 pb-3">
            {points.map((point) => {
              const height = Math.max((point.value / maxValue) * 100, 7);

              return (
                <div key={point.label} className="flex min-w-20 flex-1 flex-col items-center gap-2">
                  <div className="text-center text-xs font-bold text-[#5a173b]">{formatMoney(point.value)}</div>
                  <div
                    className="w-full max-w-16 rounded-t-lg bg-gradient-to-t from-[#5a173b] via-[#b75561] to-[#efa18e] shadow-[0_8px_16px_rgba(90,23,59,0.18)]"
                    style={{ height: `${height}%` }}
                    title={`${point.label}: ${formatMoney(point.value)}`}
                  />
                  <div className="min-h-8 text-center text-xs font-bold text-[#6f475c]">{point.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const selectedFrom = parseDateInput(params.from, new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const selectedTo = parseDateInput(params.to, new Date());
  const from = selectedFrom <= selectedTo ? selectedFrom : selectedTo;
  const to = selectedFrom <= selectedTo ? selectedTo : selectedFrom;
  to.setHours(23, 59, 59, 999);

  const dailyTrendStart = startOfDay(from);
  const [
    dailyJobs,
    monthlyJobs,
    completedJobs,
    pendingJobs,
    dailyCollection,
    monthlyRevenue,
    overallRevenue,
    pendingPayments,
    customerBilling,
    vehicleHistory,
    revenueTrendInvoices,
    collectionTrendPayments,
  ] =
    await Promise.all([
      prisma.jobCard.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.jobCard.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.jobCard.count({ where: { status: "DELIVERED", createdAt: { gte: from, lte: to } } }),
      prisma.jobCard.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: { invoiceDate: { gte: from, lte: to } },
      }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        _sum: { balanceAmount: true },
        where: { paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      }),
      prisma.customer.findMany({
        where: {
          OR: [{ invoices: { some: {} } }, { payments: { some: {} } }],
        },
        include: { invoices: true, payments: true },
        orderBy: { name: "asc" },
        take: 12,
      }),
      prisma.vehicle.findMany({
        where: {
          OR: [{ jobCards: { some: {} } }, { invoices: { some: {} } }],
        },
        include: { customer: true, jobCards: true, invoices: true },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      prisma.invoice.findMany({
        where: { invoiceDate: { gte: from, lte: to } },
        select: { invoiceDate: true, totalAmount: true },
      }),
      prisma.payment.findMany({
        where: { paymentDate: { gte: from, lte: to } },
        select: { paymentDate: true, amount: true },
      }),
    ]);

  const csvHref = `/reports/export.csv?from=${from.toISOString()}&to=${to.toISOString()}`;
  const monthlyRevenuePoints = monthsBetween(from, to).map((month) => {
    const key = monthKey(month);
    const value = revenueTrendInvoices
      .filter((invoice) => monthKey(invoice.invoiceDate) === key)
      .reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);

    return {
      label: month.toLocaleDateString("en-IN", { month: "short" }),
      value,
    };
  });
  const dailyCollectionPoints = daysBetween(dailyTrendStart, to).map((day) => {
    const key = dateKey(day);
    const value = collectionTrendPayments
      .filter((payment) => dateKey(payment.paymentDate) === key)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      label: day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      value,
    };
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Reports" description="Date range and payment filters apply to summary counts." />
      <Card>
        <CardHeader title="Filters" action={<a href={csvHref} className="text-sm font-bold text-[#5a173b] hover:underline">Export CSV</a>} />
        <CardBody>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
            <input name="from" type="date" defaultValue={dateInputValue(from)} className={inputClass} />
            <input name="to" type="date" defaultValue={dateInputValue(to)} className={inputClass} />
            <button className="rounded-lg bg-[#5a173b] px-4 text-sm font-bold text-white hover:bg-[#42102e]">Apply</button>
            <a
              href="/reports"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[#e7c9c1] bg-[#fff8f2] px-4 text-sm font-bold text-[#4b1737] hover:bg-[#f4ded6]"
            >
              Reset
            </a>
          </form>
        </CardBody>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Daily Job Cards" value={dailyJobs} />
        <StatCard label="Monthly Job Cards" value={monthlyJobs} />
        <StatCard label="Completed Jobs" value={completedJobs} />
        <StatCard label="Pending Jobs" value={pendingJobs} />
        <StatCard label="Daily Collection" value={formatMoney(dailyCollection._sum.amount)} />
        <StatCard label="Monthly Revenue" value={formatMoney(monthlyRevenue._sum.totalAmount)} />
        <StatCard label="Over All Revenue" value={formatMoney(overallRevenue._sum.totalAmount)} />
        <StatCard label="Pending Payments" value={formatMoney(pendingPayments._sum.balanceAmount)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <RevenueBarChart title="Monthly Revenue Graph" points={monthlyRevenuePoints} empty="No invoice revenue found for the selected dates." />
        <RevenueBarChart title="Daily Collection Graph" points={dailyCollectionPoints} empty="No payment collection found for the selected dates." />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Customer-wise Billing" />
          <CardBody>
            <DataTable
              headers={["Customer", "Billed", "Paid", "Pending"]}
              empty="No customer billing data."
              rows={customerBilling.map((customer) => {
                const billed = customer.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
                const paid = customer.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
                return [customer.name, formatMoney(billed), formatMoney(paid), formatMoney(billed - paid)];
              })}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Vehicle-wise History" />
          <CardBody>
            <DataTable
              headers={["Vehicle", "Owner", "Services", "Billed"]}
              empty="No vehicle history data."
              rows={vehicleHistory.map((vehicle) => [
                vehicle.vehicleNumber,
                vehicle.customer.name,
                vehicle.jobCards.length,
                formatMoney(vehicle.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0)),
              ])}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
