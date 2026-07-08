import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentForm, WhatsAppSendForm } from "@/components/forms";
import { WhatsAppActions } from "@/components/whatsapp-actions";
import { Badge, Button, Card, CardBody, CardHeader, DataTable, DetailGrid, DetailItem, PageHeader } from "@/components/ui";
import { createPaymentConfirmationLog, markVehicleDelivered, sendInvoiceReminder } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceGeneratedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      jobCard: true,
      estimate: true,
      serviceAdvisor: true,
      items: true,
      payments: { orderBy: { paymentDate: "desc" } },
      whatsappLogs: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });

  if (!invoice) notFound();

  const invoicesForPayment = await prisma.invoice.findMany({
    where: { id: invoice.id },
    include: { customer: true },
  });

  const message = invoiceGeneratedBody({
    customerId: invoice.customerId,
    jobCardId: invoice.jobCardId,
    invoiceId: invoice.id,
    customerName: invoice.customer.name,
    mobileNumber: invoice.customer.whatsapp || invoice.customer.mobile,
    vehicleNumber: invoice.vehicle.vehicleNumber,
    invoiceNumber: invoice.invoiceNumber,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    balanceAmount: invoice.balanceAmount,
    trackingToken: invoice.jobCard.trackingToken,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.customer.name} - ${invoice.vehicle.vehicleNumber}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button href={`/invoices/${invoice.id}/edit`} variant="secondary">Edit Invoice</Button>
            <Button href={`/payments/new?invoiceId=${invoice.id}`} variant="secondary">Record Payment</Button>
            <Button href={`/invoices/${invoice.id}/print`} variant="secondary">Print</Button>
          </div>
        }
      />
      <Card>
        <CardHeader title="Invoice Summary" action={<Badge value={invoice.paymentStatus} />} />
        <CardBody>
          <DetailGrid>
            <DetailItem labelText="Job card" value={<Link href={`/job-cards/${invoice.jobCardId}`} className="text-teal-700">{invoice.jobCard.jobCardNumber}</Link>} />
            <DetailItem labelText="Estimate" value={invoice.estimate ? <Link href={`/estimates/${invoice.estimateId}`} className="text-teal-700">{invoice.estimate.estimateNumber}</Link> : "Skipped"} />
            <DetailItem labelText="Date" value={formatDate(invoice.invoiceDate)} />
            <DetailItem labelText="Customer" value={invoice.customer.name} />
            <DetailItem labelText="Vehicle" value={invoice.vehicle.vehicleNumber} />
            <DetailItem labelText="Service advisor" value={invoice.serviceAdvisor?.name} />
            <DetailItem labelText="Grand total" value={formatMoney(invoice.totalAmount)} />
            <DetailItem labelText="Paid amount" value={formatMoney(invoice.paidAmount)} />
            <DetailItem labelText="Balance amount" value={formatMoney(invoice.balanceAmount)} />
            <DetailItem labelText="Delivery status" value={invoice.deliveryStatus} />
            <DetailItem labelText="Notes" value={invoice.notes} />
          </DetailGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Service / Parts / Labour" />
        <CardBody>
          <DataTable
            headers={["Description", "Category", "Quantity", "Unit Price", "Amount"]}
            empty="No invoice items."
            rows={invoice.items.map((item) => [
              item.description,
              item.category,
              item.quantity.toString(),
              formatMoney(item.unitPrice),
              formatMoney(item.amount),
            ])}
          />
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Payments" />
          <CardBody className="grid gap-5">
            <PaymentForm invoices={invoicesForPayment} selectedInvoiceId={invoice.id} />
            <DataTable
              headers={["Date", "Amount", "Mode", "Reference", "Notes"]}
              empty="No payments recorded."
              rows={invoice.payments.map((payment) => [
                formatDate(payment.paymentDate),
                formatMoney(payment.amount),
                payment.mode,
                payment.referenceNumber ?? "-",
                payment.notes ?? "-",
              ])}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Invoice Actions" />
          <CardBody className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <form action={sendInvoiceReminder.bind(null, invoice.id)}>
                <Button type="submit" variant="secondary">Send Payment Reminder</Button>
              </form>
              <form action={createPaymentConfirmationLog.bind(null, invoice.id)}>
                <Button type="submit" variant="secondary">Payment Confirmation</Button>
              </form>
              <form action={markVehicleDelivered.bind(null, invoice.jobCardId)}>
                <Button type="submit" variant="secondary">Mark Vehicle Delivered</Button>
              </form>
            </div>
            <WhatsAppActions mobileNumber={invoice.customer.whatsapp || invoice.customer.mobile} message={message} />
            <WhatsAppSendForm
              mobileNumber={invoice.customer.whatsapp || invoice.customer.mobile}
              messageBody={message}
              messageType="INVOICE_GENERATED"
              returnTo={`/invoices/${invoice.id}`}
              customerId={invoice.customerId}
              jobCardId={invoice.jobCardId}
              invoiceId={invoice.id}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="WhatsApp Logs" />
        <CardBody>
          <DataTable
            headers={["Type", "Method", "Status", "API Message ID", "Time"]}
            empty="No WhatsApp logs."
            rows={invoice.whatsappLogs.map((log) => [
              log.messageType,
              log.sendMethod,
              <Badge key="status" value={log.status} />,
              log.apiMessageId ?? "-",
              formatDate(log.createdAt),
            ])}
          />
        </CardBody>
      </Card>
    </div>
  );
}
