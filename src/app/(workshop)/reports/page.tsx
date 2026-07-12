import { Card, CardBody, CardHeader, DataTable, PageHeader, StatCard, inputClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; technician?: string; paymentStatus?: string }>;
}) {
  const params = await searchParams;
  const from = params.from ? new Date(params.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = params.to ? new Date(params.to) : new Date();
  to.setHours(23, 59, 59, 999);

  const paymentStatus = params.paymentStatus?.trim();
  const [dailyJobs, monthlyJobs, completedJobs, pendingJobs, dailyCollection, monthlyRevenue, pendingPayments, estimateGroups, customerBilling, vehicleHistory] =
    await Promise.all([
      prisma.jobCard.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.jobCard.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.jobCard.count({ where: { status: "DELIVERED", createdAt: { gte: from, lte: to } } }),
      prisma.jobCard.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          invoiceDate: { gte: from, lte: to },
          paymentStatus: paymentStatus ? (paymentStatus as never) : undefined,
        },
      }),
      prisma.invoice.aggregate({
        _sum: { balanceAmount: true },
        where: { paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      }),
      prisma.estimate.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.customer.findMany({
        include: { invoices: true, payments: true },
        orderBy: { name: "asc" },
        take: 12,
      }),
      prisma.vehicle.findMany({
        include: { customer: true, jobCards: true, invoices: true },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
    ]);

  const csvHref = `/reports/export.csv?from=${from.toISOString()}&to=${to.toISOString()}`;

  return (
    <div className="grid gap-6">
      <PageHeader title="Reports" description="Date range and payment filters apply to summary counts." />
      <Card>
        <CardHeader title="Filters" action={<a href={csvHref} className="text-sm font-bold text-[#5a173b] hover:underline">Export CSV</a>} />
        <CardBody>
          <form className="grid gap-3 md:grid-cols-4">
            <input name="from" type="date" defaultValue={from.toISOString().slice(0, 10)} className={inputClass} />
            <input name="to" type="date" defaultValue={to.toISOString().slice(0, 10)} className={inputClass} />
            <input name="paymentStatus" placeholder="Payment status" defaultValue={params.paymentStatus ?? ""} className={inputClass} />
            <button className="rounded-lg bg-[#5a173b] px-4 text-sm font-bold text-white hover:bg-[#42102e]">Apply</button>
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
        <StatCard label="Pending Payments" value={formatMoney(pendingPayments._sum.balanceAmount)} />
        <StatCard label="Estimate Approvals" value={estimateGroups.find((item) => item.status === "APPROVED")?._count.status ?? 0} />
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
