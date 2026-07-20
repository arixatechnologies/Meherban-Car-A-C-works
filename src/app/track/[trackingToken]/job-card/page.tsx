import { notFound } from "next/navigation";
import { JobCardPreview } from "@/components/job-card-preview";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PublicJobCardPrintPage({
  params,
}: {
  params: Promise<{ trackingToken: string }>;
}) {
  const { trackingToken } = await params;
  const jobCard = await prisma.jobCard.findUnique({
    where: { trackingToken },
    select: { id: true },
  });

  if (!jobCard) notFound();

  return (
    <main className="bg-slate-100 p-4 print:bg-white print:p-0">
      <JobCardPreview id={jobCard.id} />
      <div className="no-print mt-4 text-center">
        <PrintButton />
      </div>
    </main>
  );
}
