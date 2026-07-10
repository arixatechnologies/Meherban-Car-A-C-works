import { JobCardPreview } from "@/components/job-card-preview";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PrintJobCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="bg-slate-100 p-4 print:bg-white print:p-0">
      <JobCardPreview id={id} />
      <div className="no-print mt-4 text-center">
        <PrintButton />
      </div>
    </main>
  );
}
