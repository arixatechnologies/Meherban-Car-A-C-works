import { CreditCard, Edit, FileDown, MessageCircle, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DocumentChain } from "@/components/document-chain";
import { InvoicePreview } from "@/components/invoice-preview";
import { Button } from "@/components/ui";
import { deleteInvoice } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { createWhatsAppLink, invoiceGeneratedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      jobCard: true,
      estimate: true,
      _count: { select: { payments: true } },
    },
  });

  if (!invoice) notFound();

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
  const externalButtonClass = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
  );
  const canDelete = user.role === "ADMIN";
  const deleteDisabled = !canDelete || invoice._count.payments > 0;
  const deleteDisabledReason = !canDelete
    ? "Only admin can delete invoices."
    : "Delete recorded payments first.";

  return (
    <div className="grid gap-4">
      <div className="no-print mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Button href={`/payments/new?invoiceId=${invoice.id}`}>
          <CreditCard className="h-4 w-4" />
          Record Payment
        </Button>
        <Button href={`/invoices/${invoice.id}/print`} variant="secondary">
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
        <a
          href={createWhatsAppLink(invoice.customer.whatsapp || invoice.customer.mobile, message)}
          target="_blank"
          rel="noreferrer"
          className={externalButtonClass}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Share
        </a>
        <Button href={`/invoices/${invoice.id}/edit`} variant="secondary">
          <Edit className="h-4 w-4" />
          Edit
        </Button>
        <form action={deleteInvoice.bind(null, invoice.id)}>
          <ConfirmSubmitButton disabled={deleteDisabled} disabledReason={deleteDisabledReason}>
            <Trash2 className="h-4 w-4" />
            Delete
          </ConfirmSubmitButton>
        </form>
      </div>

      <DocumentChain
        items={[
          { label: "Job Card", href: `/job-cards/${invoice.jobCardId}`, number: invoice.jobCard.jobCardNumber },
          { label: "Estimate", href: invoice.estimateId ? `/estimates/${invoice.estimateId}` : null, number: invoice.estimate?.estimateNumber },
          { label: "Invoice", href: `/invoices/${invoice.id}`, number: invoice.invoiceNumber },
        ]}
      />

      <InvoicePreview id={invoice.id} />
    </div>
  );
}
