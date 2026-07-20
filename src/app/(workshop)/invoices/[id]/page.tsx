import { CreditCard, Edit, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { WhatsAppIcon } from "@/components/action-icons";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DocumentChain } from "@/components/document-chain";
import { InvoicePreview } from "@/components/invoice-preview";
import { PdfDownloadButton } from "@/components/pdf-download-button";
import { Button } from "@/components/ui";
import { deleteInvoice } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createWhatsAppLink, invoiceGeneratedBody, requestAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const baseUrl = await requestAppUrl();
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
    baseUrl,
  });
  const pdfButtonClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#f1b8b8] bg-[#fff0f0] px-4 text-sm font-bold text-[#c62828] transition hover:bg-[#ffe0e0] focus:outline-none focus:ring-2 focus:ring-[#e05252] focus:ring-offset-2";
  const whatsappButtonClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#9bd7ad] bg-[#e8f8ed] px-4 text-sm font-bold text-[#128c3a] transition hover:bg-[#d8f2df] focus:outline-none focus:ring-2 focus:ring-[#25d366] focus:ring-offset-2";
  const canDelete = user.role === "ADMIN";
  const deleteDisabled = !canDelete || invoice._count.payments > 0;
  const deleteDisabledReason = !canDelete
    ? "Only admin can delete invoices."
    : "Delete recorded payments first.";

  return (
    <div className="grid gap-4">
      <div className="no-print mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-end gap-2 rounded-xl border border-[#e7c9c1] bg-[#fffaf5] p-3 shadow-[0_10px_28px_rgba(90,23,59,0.08)]">
        <Button href={`/payments/new?invoiceId=${invoice.id}`}>
          <CreditCard className="h-4 w-4" />
          Record Payment
        </Button>
        <PdfDownloadButton href={`/invoices/${invoice.id}/pdf`} className={pdfButtonClass} />
        <a
          href={createWhatsAppLink(invoice.customer.whatsapp || invoice.customer.mobile, message)}
          target="_blank"
          rel="noreferrer"
          className={whatsappButtonClass}
        >
          <WhatsAppIcon className="h-4 w-4" />
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
