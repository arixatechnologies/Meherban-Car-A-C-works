import { Calculator, Edit, FileDown, MessageCircle, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
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
      estimates: { select: { id: true }, take: 1 },
      invoices: { select: { id: true }, take: 1 },
    },
  });

  if (!jobCard) notFound();

  const canDelete = user.role === "ADMIN";
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
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
  );

  return (
    <div className="grid gap-4">
      <div className="no-print mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Button href={`/estimates/new?jobCardId=${jobCard.id}`}>
          <Calculator className="h-4 w-4" />
          Create Estimation
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

      <JobCardPreview id={jobCard.id} />
    </div>
  );
}
