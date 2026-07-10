import { notFound } from "next/navigation";
import { EstimatePreview } from "@/components/estimate-preview";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PublicEstimatePrintPage({
  params,
}: {
  params: Promise<{ trackingToken: string }>;
}) {
  const { trackingToken } = await params;
  const jobCard = await prisma.jobCard.findUnique({
    where: { trackingToken },
    include: { estimates: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!jobCard?.estimates[0]) notFound();

  return (
    <main className="bg-slate-100 p-4 print:bg-white print:p-0">
      <EstimatePreview id={jobCard.estimates[0].id} />
      <div className="no-print mt-4 text-center">
        <PrintButton />
      </div>
    </main>
  );
}
