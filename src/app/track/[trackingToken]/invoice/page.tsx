import { notFound } from "next/navigation";
import { InvoicePreview } from "@/components/invoice-preview";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PublicInvoicePrintPage({
  params,
}: {
  params: Promise<{ trackingToken: string }>;
}) {
  const { trackingToken } = await params;
  const jobCard = await prisma.jobCard.findUnique({
    where: { trackingToken },
    include: { invoices: { orderBy: { invoiceDate: "desc" }, take: 1 } },
  });

  if (!jobCard?.invoices[0]) notFound();

  return (
    <main className="bg-slate-100 p-4 print:bg-white print:p-0">
      <InvoicePreview id={jobCard.invoices[0].id} />
      <div className="no-print mt-4 text-center">
        <PrintButton />
      </div>
    </main>
  );
}
