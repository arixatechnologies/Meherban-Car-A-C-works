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
      select: { jobCardNumber: true },
    });

    if (!jobCard) return new Response("Job card not found", { status: 404 });

    const pdfUrl = new URL(`/track/${trackingToken}/job-card`, request.url);
    const pdf = await renderPdfFromUrl(pdfUrl.toString());

    return pdfResponse(pdf, jobCard.jobCardNumber);
  } catch (error) {
    return pdfErrorResponse(error);
  }
}
