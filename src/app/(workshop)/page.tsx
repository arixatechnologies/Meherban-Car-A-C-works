import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, DataTable, PageHeader, SearchBar } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const records = await prisma.jobCard.findMany({
    where: q
      ? {
          OR: [
            { jobCardNumber: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { mobile: { contains: q } } },
            { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" } } },
            { estimates: { some: { estimateNumber: { contains: q, mode: "insensitive" } } } },
            { invoices: { some: { invoiceNumber: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    include: {
      customer: true,
      vehicle: true,
      assignedTechnician: true,
      estimates: { orderBy: { createdAt: "desc" }, take: 1 },
      invoices: { orderBy: { invoiceDate: "desc" }, take: 1 },
    },
    orderBy: { dateTime: "desc" },
    take: 100,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Home"
        description="Complete workshop history in one place."
      />

      <Card>
        <CardHeader
          title="Workshop History"
          action={
            <SearchBar
              defaultValue={q}
              placeholder="Search customer, mobile, vehicle, job card, estimate, invoice"
            />
          }
        />
        <CardBody>
          <DataTable
            headers={[
              "Job Card",
              "Date",
              "Customer",
              "Vehicle",
              "Complaint",
              "Estimate",
              "Invoice",
              "Amount",
              "Payment",
              "Status",
            ]}
            empty="No workshop history found."
            rows={records.map((record) => {
              const estimate = record.estimates[0];
              const invoice = record.invoices[0];

              return [
                <Link
                  key="job"
                  href={`/job-cards/${record.id}`}
                  className="font-semibold text-teal-700"
                >
                  {record.jobCardNumber}
                </Link>,
                formatDate(record.dateTime),
                record.customer.name,
                record.vehicle.vehicleNumber,
                [...record.complaints, record.customComplaint].filter(Boolean).join(", ") || "-",
                estimate ? (
                  <Link key="estimate" href={`/estimates/${estimate.id}`} className="font-semibold text-teal-700">
                    {estimate.estimateNumber}
                  </Link>
                ) : (
                  "-"
                ),
                invoice ? (
                  <Link key="invoice" href={`/invoices/${invoice.id}`} className="font-semibold text-teal-700">
                    {invoice.invoiceNumber}
                  </Link>
                ) : (
                  "-"
                ),
                invoice ? formatMoney(invoice.totalAmount) : estimate ? formatMoney(estimate.totalAmount) : "-",
                invoice ? <Badge key="payment" value={invoice.paymentStatus} /> : "-",
                <Badge key="status" value={record.status} />,
              ];
            })}
          />
        </CardBody>
      </Card>
    </div>
  );
}
