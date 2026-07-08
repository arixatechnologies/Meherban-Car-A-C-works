import Link from "next/link";
import { RowActionMenu } from "@/components/row-action-menu";
import { Badge, Button, Card, CardBody, CardHeader, DataTable, PageHeader, SearchBar, inputClass } from "@/components/ui";
import { deleteInvoice } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { invoicePaymentStatuses } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { label } from "@/lib/utils";
import { createWhatsAppLink, invoiceGeneratedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const canDelete = user.role === "ADMIN";
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const invoices = await prisma.invoice.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { invoiceNumber: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
                { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
        status ? { paymentStatus: status as never } : {},
      ],
    },
    include: {
      customer: true,
      vehicle: true,
      jobCard: true,
      payments: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Invoices" action={<Button href="/invoices/new">New invoice</Button>} />
      <Card>
        <CardHeader
          title="Invoice Register"
          action={
            <SearchBar defaultValue={q} placeholder="Search invoice, customer, vehicle">
              <select name="status" defaultValue={status} className={inputClass}>
                <option value="">All payment statuses</option>
                {invoicePaymentStatuses.map((item) => (
                  <option key={item} value={item}>
                    {label(item)}
                  </option>
                ))}
              </select>
            </SearchBar>
          }
        />
        <CardBody>
          <DataTable
            headers={["Invoice", "Date", "Job Card", "Customer", "Vehicle", "Total", "Balance", "Status", "Action"]}
            empty="No invoices found."
            rows={invoices.map((invoice) => {
              const hasPayments = invoice.payments.length > 0;
              const message = invoiceGeneratedBody({
                customerId: invoice.customerId,
                jobCardId: invoice.jobCardId,
                invoiceId: invoice.id,
                customerName: invoice.customer.name,
                mobileNumber: invoice.customer.whatsapp || invoice.customer.mobile,
                vehicleNumber: invoice.vehicle.vehicleNumber,
                jobCardNumber: invoice.jobCard.jobCardNumber,
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: invoice.totalAmount,
                paidAmount: invoice.paidAmount,
                balanceAmount: invoice.balanceAmount,
                trackingToken: invoice.jobCard.trackingToken,
              });

              return [
                <Link key="no" href={`/invoices/${invoice.id}`} className="font-semibold text-teal-700">
                  {invoice.invoiceNumber}
                </Link>,
                formatDate(invoice.invoiceDate),
                invoice.jobCard.jobCardNumber,
                invoice.customer.name,
                invoice.vehicle.vehicleNumber,
                formatMoney(invoice.totalAmount),
                formatMoney(invoice.balanceAmount),
                <Badge key="status" value={invoice.paymentStatus} />,
                <RowActionMenu
                  key="action"
                  previewHref={`/invoices/${invoice.id}/print`}
                  whatsappHref={createWhatsAppLink(invoice.customer.whatsapp || invoice.customer.mobile, message)}
                  deleteAction={deleteInvoice.bind(null, invoice.id)}
                  deleteDisabled={!canDelete || hasPayments}
                  deleteDisabledReason={
                    !canDelete ? "Only admin can delete invoices." : "Delete is blocked because payments are recorded."
                  }
                />,
              ];
            })}
          />
        </CardBody>
      </Card>
    </div>
  );
}
