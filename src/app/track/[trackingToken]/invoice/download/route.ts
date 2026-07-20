import { prisma } from "@/lib/db";
import { pdfErrorResponse, pdfResponse, renderPdfFromUrl } from "@/lib/pdf-download";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ trackingToken: string }> },
) {
  try {
    const { trackingToken } = await params;
    const jobCard = await prisma.jobCard.findUnique({
      where: { trackingToken },
      include: {
        invoices: { select: { invoiceNumber: true }, orderBy: { invoiceDate: "desc" }, take: 1 },
      },
    });
    const invoice = jobCard?.invoices[0];

    if (!invoice) return new Response("Invoice not found", { status: 404 });

    const pdfUrl = new URL(`/track/${trackingToken}/invoice`, request.url);
    const pdf = await renderPdfFromUrl(pdfUrl.toString());

    return pdfResponse(pdf, invoice.invoiceNumber);
  } catch (error) {
    return pdfErrorResponse(error);
  }
}
