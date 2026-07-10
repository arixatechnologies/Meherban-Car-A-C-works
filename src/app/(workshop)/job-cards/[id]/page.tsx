import { Calculator, Edit, FileDown, MessageCircle, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DocumentChain } from "@/components/document-chain";
import { JobCardPreview } from "@/components/job-card-preview";
import { Button } from "@/components/ui";
import { deleteJobCard } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { createWhatsAppLink, jobCardCreatedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function JobCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      estimates: { select: { id: true, estimateNumber: true }, orderBy: { createdAt: "desc" }, take: 1 },
      invoices: { select: { id: true, invoiceNumber: true }, orderBy: { invoiceDate: "desc" }, take: 1 },
    },
  });

  if (!jobCard) notFound();

  const canDelete = user.role === "ADMIN";
  const latestEstimate = jobCard.estimates[0];
  const latestInvoice = jobCard.invoices[0];
  const hasLinkedRecords = jobCard.estimates.length > 0 || jobCard.invoices.length > 0;
  const deleteDisabled = !canDelete || hasLinkedRecords;
  const deleteDisabledReason = !canDelete
    ? "Only admin can delete job cards."
    : "Delete linked estimates and invoices first.";
  const message = jobCardCreatedBody({
    customerId: jobCard.customerId,
    jobCardId: jobCard.id,
    customerName: jobCard.customer.name,
    mobileNumber: jobCard.customer.whatsapp || jobCard.customer.mobile,
    vehicleNumber: jobCard.vehicle.vehicleNumber,
    jobCardNumber: jobCard.jobCardNumber,
    trackingToken: jobCard.trackingToken,
  });
  const externalButtonClass = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e7c9c1] bg-[#fff8f2] px-4 text-sm font-bold text-[#4b1737] transition hover:bg-[#f4ded6] focus:outline-none focus:ring-2 focus:ring-[#d97873] focus:ring-offset-2",
  );

  return (
    <div className="grid gap-4">
      <div className="no-print mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-end gap-2 rounded-xl border border-[#e7c9c1] bg-[#fffaf5] p-3 shadow-[0_10px_28px_rgba(90,23,59,0.08)]">
        <Button href={latestEstimate ? `/estimates/${latestEstimate.id}` : `/estimates/new?jobCardId=${jobCard.id}`}>
          <Calculator className="h-4 w-4" />
          {latestEstimate ? "View Estimation" : "Create Estimation"}
        </Button>
        <Button href={`/job-cards/${jobCard.id}/print`} variant="secondary">
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
        <a
          href={createWhatsAppLink(jobCard.customer.whatsapp || jobCard.customer.mobile, message)}
          target="_blank"
          rel="noreferrer"
          className={externalButtonClass}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Share
        </a>
        <Button href={`/job-cards/${jobCard.id}/edit`} variant="secondary">
          <Edit className="h-4 w-4" />
          Edit
        </Button>
        <form action={deleteJobCard.bind(null, jobCard.id)}>
          <ConfirmSubmitButton disabled={deleteDisabled} disabledReason={deleteDisabledReason}>
            <Trash2 className="h-4 w-4" />
            Delete
          </ConfirmSubmitButton>
        </form>
      </div>

      <DocumentChain
        items={[
          { label: "Job Card", href: `/job-cards/${jobCard.id}`, number: jobCard.jobCardNumber },
          { label: "Estimate", href: latestEstimate ? `/estimates/${latestEstimate.id}` : null, number: latestEstimate?.estimateNumber },
          { label: "Invoice", href: latestInvoice ? `/invoices/${latestInvoice.id}` : null, number: latestInvoice?.invoiceNumber },
        ]}
      />

      <JobCardPreview id={jobCard.id} />
    </div>
  );
}
