import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pdfResponse, renderPdfFromUrl } from "@/lib/pdf-download";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { invoiceNumber: true },
  });
  if (!invoice) return new Response("Invoice not found", { status: 404 });

  const pdfUrl = new URL(`/invoices/${id}/print`, request.url);
  const pdf = await renderPdfFromUrl(pdfUrl.toString(), request.headers.get("cookie"));

  return pdfResponse(pdf, invoice.invoiceNumber);
}
