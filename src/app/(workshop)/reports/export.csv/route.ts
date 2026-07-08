import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  await requireUser();
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ? new Date(String(url.searchParams.get("from"))) : undefined;
  const to = url.searchParams.get("to") ? new Date(String(url.searchParams.get("to"))) : undefined;

  const invoices = await prisma.invoice.findMany({
    where: from && to ? { invoiceDate: { gte: from, lte: to } } : undefined,
    include: { customer: true, vehicle: true, jobCard: true },
    orderBy: { invoiceDate: "desc" },
  });

  const rows = [
    ["Invoice", "Date", "Job Card", "Customer", "Vehicle", "Total", "Paid", "Balance", "Payment Status"],
    ...invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.invoiceDate.toISOString(),
      invoice.jobCard.jobCardNumber,
      invoice.customer.name,
      invoice.vehicle.vehicleNumber,
      invoice.totalAmount.toString(),
      invoice.paidAmount.toString(),
      invoice.balanceAmount.toString(),
      invoice.paymentStatus,
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meherban-report.csv"',
    },
  });
}
