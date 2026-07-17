import { Edit, ReceiptText, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { PdfDownloadIcon, WhatsAppIcon } from "@/components/action-icons";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DocumentChain } from "@/components/document-chain";
import { EstimatePreview } from "@/components/estimate-preview";
import { Button } from "@/components/ui";
import { deleteEstimate } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createWhatsAppLink, estimateSharedBody, requestAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const baseUrl = await requestAppUrl();
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      jobCard: true,
      invoices: { select: { id: true, invoiceNumber: true }, take: 1 },
    },
  });

  if (!estimate) notFound();

  const message = estimateSharedBody({
    customerId: estimate.customerId,
    jobCardId: estimate.jobCardId,
    estimateId: estimate.id,
    customerName: estimate.customer.name,
    mobileNumber: estimate.customer.whatsapp || estimate.customer.mobile,
    vehicleNumber: estimate.vehicle.vehicleNumber,
    estimateNumber: estimate.estimateNumber,
    totalAmount: estimate.totalAmount,
    trackingToken: estimate.jobCard.trackingToken,
    baseUrl,
  });
  const pdfButtonClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#f1b8b8] bg-[#fff0f0] px-4 text-sm font-bold text-[#c62828] transition hover:bg-[#ffe0e0] focus:outline-none focus:ring-2 focus:ring-[#e05252] focus:ring-offset-2";
  const whatsappButtonClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#9bd7ad] bg-[#e8f8ed] px-4 text-sm font-bold text-[#128c3a] transition hover:bg-[#d8f2df] focus:outline-none focus:ring-2 focus:ring-[#25d366] focus:ring-offset-2";
  const existingInvoice = estimate.invoices[0];
  const canDelete = user.role === "ADMIN";
  const deleteDisabled = !canDelete || Boolean(existingInvoice);
  const deleteDisabledReason = !canDelete
    ? "Only admin can delete estimates."
    : "Delete linked invoices first.";

  return (
    <div className="grid gap-4">
      <div className="no-print mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-end gap-2 rounded-xl border border-[#e7c9c1] bg-[#fffaf5] p-3 shadow-[0_10px_28px_rgba(90,23,59,0.08)]">
        <Button href={existingInvoice ? `/invoices/${existingInvoice.id}` : `/invoices/new?estimateId=${estimate.id}`}>
          <ReceiptText className="h-4 w-4" />
          {existingInvoice ? "View Invoice" : "Create Invoice"}
        </Button>
        <a href={`/estimates/${estimate.id}/pdf`} download className={pdfButtonClass}>
          <PdfDownloadIcon />
          Download PDF
        </a>
        <a
          href={createWhatsAppLink(estimate.customer.whatsapp || estimate.customer.mobile, message)}
          target="_blank"
          rel="noreferrer"
          className={whatsappButtonClass}
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp Share
        </a>
        <Button href={`/estimates/${estimate.id}/edit`} variant="secondary">
          <Edit className="h-4 w-4" />
          Edit
        </Button>
        <form action={deleteEstimate.bind(null, estimate.id)}>
          <ConfirmSubmitButton disabled={deleteDisabled} disabledReason={deleteDisabledReason}>
            <Trash2 className="h-4 w-4" />
            Delete
          </ConfirmSubmitButton>
        </form>
      </div>

      <DocumentChain
        items={[
          { label: "Job Card", href: `/job-cards/${estimate.jobCardId}`, number: estimate.jobCard.jobCardNumber },
          { label: "Estimate", href: `/estimates/${estimate.id}`, number: estimate.estimateNumber },
          { label: "Invoice", href: existingInvoice ? `/invoices/${existingInvoice.id}` : null, number: existingInvoice?.invoiceNumber },
        ]}
      />

      <EstimatePreview id={estimate.id} />
    </div>
  );
}
