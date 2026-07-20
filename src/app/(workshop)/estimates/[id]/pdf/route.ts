import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pdfErrorResponse, pdfResponse, renderPdfFromUrl } from "@/lib/pdf-download";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return new Response("Unauthorized", { status: 401 });

    const { id } = await params;
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      select: { estimateNumber: true },
    });
    if (!estimate) return new Response("Estimate not found", { status: 404 });

    const pdfUrl = new URL(`/estimates/${id}/print`, request.url);
    const pdf = await renderPdfFromUrl(pdfUrl.toString(), request.headers.get("cookie"));

    return pdfResponse(pdf, estimate.estimateNumber);
  } catch (error) {
    return pdfErrorResponse(error);
  }
}
