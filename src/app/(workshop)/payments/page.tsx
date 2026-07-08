import Link from "next/link";
import { Button, Card, CardBody, CardHeader, DataTable, PageHeader, SearchBar } from "@/components/ui";
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
  const payments = await prisma.payment.findMany({
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
  });

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
              <Link key="view" href={`/payments/${payment.id}`} className="font-semibold text-teal-700">
                View
              </Link>,
            ])}
          />
        </CardBody>
      </Card>
    </div>
  );
}
