import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, DataTable, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";

  const [jobCards, estimates, invoices] = q
    ? await Promise.all([
        prisma.jobCard.findMany({
          where: {
            OR: [
              { jobCardNumber: { contains: q, mode: "insensitive" } },
              { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" } } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
              { customer: { mobile: { contains: q } } },
            ],
          },
          include: { customer: true, vehicle: true },
          take: 10,
        }),
        prisma.estimate.findMany({
          where: {
            OR: [
              { estimateNumber: { contains: q, mode: "insensitive" } },
              { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" } } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
              { customer: { mobile: { contains: q } } },
            ],
          },
          include: { customer: true, vehicle: true },
          take: 10,
        }),
        prisma.invoice.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: q, mode: "insensitive" } },
              { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" } } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
              { customer: { mobile: { contains: q } } },
            ],
          },
          include: { customer: true, vehicle: true },
          take: 10,
        }),
      ])
    : [[], [], []];

  return (
    <div className="grid gap-6">
      <PageHeader title="Global Search" description={q ? `Results for "${q}"` : "Enter a term from the top search bar."} />
      <Card>
        <CardHeader title="Documents" />
        <CardBody>
          <DataTable
            headers={["Type", "Number", "Customer", "Vehicle", "Status / Amount", "Action"]}
            empty="No document results."
            rows={[
              ...jobCards.map((jobCard) => [
                "Job Card",
                jobCard.jobCardNumber,
                jobCard.customer.name,
                jobCard.vehicle.vehicleNumber,
                <Badge key="status" value={jobCard.status} />,
                <Link key="view" href={`/job-cards/${jobCard.id}`} className="font-bold text-[#5a173b] hover:underline">
                  View
                </Link>,
              ]),
              ...estimates.map((estimate) => [
                "Estimate",
                estimate.estimateNumber,
                estimate.customer.name,
                estimate.vehicle.vehicleNumber,
                formatMoney(estimate.totalAmount),
                <Link key="view" href={`/estimates/${estimate.id}`} className="font-bold text-[#5a173b] hover:underline">
                  View
                </Link>,
              ]),
              ...invoices.map((invoice) => [
                "Invoice",
                invoice.invoiceNumber,
                invoice.customer.name,
                invoice.vehicle.vehicleNumber,
                formatMoney(invoice.totalAmount),
                <Link key="view" href={`/invoices/${invoice.id}`} className="font-bold text-[#5a173b] hover:underline">
                  View
                </Link>,
              ]),
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
