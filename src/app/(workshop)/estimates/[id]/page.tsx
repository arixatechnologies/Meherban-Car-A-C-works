import { Edit, FileDown, MessageCircle, ReceiptText, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DocumentChain } from "@/components/document-chain";
import { EstimatePreview } from "@/components/estimate-preview";
import { Button } from "@/components/ui";
import { deleteEstimate } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { createWhatsAppLink, estimateSharedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
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
  });
  const externalButtonClass = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e7c9c1] bg-[#fff8f2] px-4 text-sm font-bold text-[#4b1737] transition hover:bg-[#f4ded6] focus:outline-none focus:ring-2 focus:ring-[#d97873] focus:ring-offset-2",
  );
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
        <Button href={`/estimates/${estimate.id}/print`} variant="secondary">
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
        <a
          href={createWhatsAppLink(estimate.customer.whatsapp || estimate.customer.mobile, message)}
          target="_blank"
          rel="noreferrer"
          className={externalButtonClass}
        >
          <MessageCircle className="h-4 w-4" />
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
