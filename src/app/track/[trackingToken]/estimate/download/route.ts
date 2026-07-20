import { prisma } from "@/lib/db";
import { pdfErrorResponse, pdfResponse, renderPdfFromUrl } from "@/lib/pdf-download";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ trackingToken: string }> },
) {
  try {
    const { trackingToken } = await params;
    const jobCard = await prisma.jobCard.findUnique({
      where: { trackingToken },
      include: {
        estimates: { select: { estimateNumber: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const estimate = jobCard?.estimates[0];

    if (!estimate) return new Response("Estimate not found", { status: 404 });

    const pdfUrl = new URL(`/track/${trackingToken}/estimate`, request.url);
    const pdf = await renderPdfFromUrl(pdfUrl.toString());

    return pdfResponse(pdf, estimate.estimateNumber);
  } catch (error) {
    return pdfErrorResponse(error);
  }
}
