import { Badge, Card, CardBody, CardHeader, DataTable, PageHeader, StatCard } from "@/components/ui";
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
  const [dailyJobs, monthlyJobs, completedJobs, pendingJobs, dailyCollection, monthlyRevenue, pendingPayments, techs, statusGroups, estimateGroups, customerBilling, vehicleHistory] =
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
      prisma.staff.findMany({
        where: { role: "TECHNICIAN" },
        include: {
          _count: {
            select: {
              assignedJobs: true,
            },
          },
        },
      }),
      prisma.jobCard.groupBy({ by: ["status"], _count: { status: true } }),
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
      <PageHeader title="Reports" description="Date range and status filters apply to summary counts." />
      <Card>
        <CardHeader title="Filters" action={<a href={csvHref} className="text-sm font-semibold text-teal-700">Export CSV</a>} />
        <CardBody>
          <form className="grid gap-3 md:grid-cols-6">
            <input name="from" type="date" defaultValue={from.toISOString().slice(0, 10)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
            <input name="to" type="date" defaultValue={to.toISOString().slice(0, 10)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
            <input name="status" placeholder="Status" defaultValue={params.status ?? ""} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
            <input name="technician" placeholder="Technician" defaultValue={params.technician ?? ""} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
            <input name="paymentStatus" placeholder="Payment status" defaultValue={params.paymentStatus ?? ""} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
            <button className="rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white">Apply</button>
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
          <CardHeader title="Status-wise Vehicles" />
          <CardBody>
            <DataTable
              headers={["Status", "Vehicles"]}
              empty="No status data."
              rows={statusGroups.map((group) => [<Badge key="status" value={group.status} />, group._count.status])}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Technician Performance" />
          <CardBody>
            <DataTable
              headers={["Technician", "Assigned Jobs", "Status"]}
              empty="No technicians."
              rows={techs.map((tech) => [tech.name, tech._count.assignedJobs, <Badge key="status" value={tech.status} />])}
            />
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Estimate Approval Report" />
        <CardBody>
          <DataTable
            headers={["Status", "Count"]}
            empty="No estimate data."
            rows={estimateGroups.map((group) => [<Badge key="status" value={group.status} />, group._count.status])}
          />
        </CardBody>
      </Card>
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
