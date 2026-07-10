import { Eye, FileDown, MessageCircle, Plus } from "lucide-react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader, DataTable, PageHeader, inputClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createWhatsAppLink, estimateSharedBody, invoiceGeneratedBody, jobCardCreatedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DocumentType = "all" | "job-card" | "estimate" | "invoice";

function filterHref(type: DocumentType, q: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type !== "all") params.set("type", type);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function iconActionClass(tone: "view" | "pdf" | "whatsapp") {
  return cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2",
    tone === "view" && "border-[#d7a9ad] bg-[#fff1e8] text-[#5a173b] hover:bg-[#f4ded6] focus:ring-[#d97873]",
    tone === "pdf" && "border-[#e7c9c1] bg-[#fffaf5] text-[#4b1737] hover:bg-[#f4ded6] focus:ring-[#d97873]",
    tone === "whatsapp" && "border-[#c9d0b1] bg-[#e9ecd9] text-[#4e5d33] hover:bg-[#dfe5c8] focus:ring-[#9fa878]",
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: DocumentType }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = params.type ?? "all";
  const jobCardWhere = q
    ? {
        OR: [
          { jobCardNumber: { contains: q, mode: "insensitive" as const } },
          { customer: { name: { contains: q, mode: "insensitive" as const } } },
          { customer: { mobile: { contains: q } } },
          { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : undefined;
  const estimateWhere = q
    ? {
        OR: [
          { estimateNumber: { contains: q, mode: "insensitive" as const } },
          { customer: { name: { contains: q, mode: "insensitive" as const } } },
          { customer: { mobile: { contains: q } } },
          { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" as const } } },
          { jobCard: { jobCardNumber: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : undefined;
  const invoiceWhere = q
    ? {
        OR: [
          { invoiceNumber: { contains: q, mode: "insensitive" as const } },
          { customer: { name: { contains: q, mode: "insensitive" as const } } },
          { customer: { mobile: { contains: q } } },
          { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" as const } } },
          { jobCard: { jobCardNumber: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : undefined;

  const [jobCards, estimates, invoices] = await Promise.all([
    prisma.jobCard.findMany({
      where: jobCardWhere,
      include: { customer: true, vehicle: true },
      orderBy: { dateTime: "desc" },
      take: 100,
    }),
    prisma.estimate.findMany({
      where: estimateWhere,
      include: { customer: true, vehicle: true, jobCard: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: { customer: true, vehicle: true, jobCard: true },
      orderBy: { invoiceDate: "desc" },
      take: 100,
    }),
  ]);

  const documents = [
    ...jobCards.map((jobCard) => ({
      kind: "job-card" as const,
      sortDate: jobCard.dateTime,
      number: jobCard.jobCardNumber,
      href: `/job-cards/${jobCard.id}`,
      pdfHref: `/job-cards/${jobCard.id}/pdf`,
      customerName: jobCard.customer.name,
      mobileNumber: jobCard.customer.whatsapp || jobCard.customer.mobile,
      vehicleNumber: jobCard.vehicle.vehicleNumber,
      status: jobCard.status,
      message: jobCardCreatedBody({
        customerId: jobCard.customerId,
        jobCardId: jobCard.id,
        customerName: jobCard.customer.name,
        mobileNumber: jobCard.customer.whatsapp || jobCard.customer.mobile,
        vehicleNumber: jobCard.vehicle.vehicleNumber,
        jobCardNumber: jobCard.jobCardNumber,
        trackingToken: jobCard.trackingToken,
      }),
    })),
    ...estimates.map((estimate) => ({
      kind: "estimate" as const,
      sortDate: estimate.date,
      number: estimate.estimateNumber,
      href: `/estimates/${estimate.id}`,
      pdfHref: `/estimates/${estimate.id}/pdf`,
      customerName: estimate.customer.name,
      mobileNumber: estimate.customer.whatsapp || estimate.customer.mobile,
      vehicleNumber: estimate.vehicle.vehicleNumber,
      status: estimate.status,
      message: estimateSharedBody({
        customerId: estimate.customerId,
        jobCardId: estimate.jobCardId,
        estimateId: estimate.id,
        customerName: estimate.customer.name,
        mobileNumber: estimate.customer.whatsapp || estimate.customer.mobile,
        vehicleNumber: estimate.vehicle.vehicleNumber,
        estimateNumber: estimate.estimateNumber,
        totalAmount: estimate.totalAmount,
        trackingToken: estimate.jobCard.trackingToken,
      }),
    })),
    ...invoices.map((invoice) => ({
      kind: "invoice" as const,
      sortDate: invoice.invoiceDate,
      number: invoice.invoiceNumber,
      href: `/invoices/${invoice.id}`,
      pdfHref: `/invoices/${invoice.id}/pdf`,
      customerName: invoice.customer.name,
      mobileNumber: invoice.customer.whatsapp || invoice.customer.mobile,
      vehicleNumber: invoice.vehicle.vehicleNumber,
      status: invoice.paymentStatus,
      message: invoiceGeneratedBody({
        customerId: invoice.customerId,
        jobCardId: invoice.jobCardId,
        invoiceId: invoice.id,
        customerName: invoice.customer.name,
        mobileNumber: invoice.customer.whatsapp || invoice.customer.mobile,
        vehicleNumber: invoice.vehicle.vehicleNumber,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        trackingToken: invoice.jobCard.trackingToken,
      }),
    })),
  ]
    .filter((document) => type === "all" || document.kind === type)
    .sort((left, right) => right.sortDate.getTime() - left.sortDate.getTime())
    .slice(0, 100);

  const filters: { label: string; value: DocumentType }[] = [
    { label: "All", value: "all" },
    { label: "Job Card", value: "job-card" },
    { label: "Estimate", value: "estimate" },
    { label: "Invoice", value: "invoice" },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Billing Workspace"
        description="All job cards, estimates, and invoices in one place."
        action={
          <Button href="/job-cards/new">
            <Plus className="h-4 w-4" />
            New Job Card
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="All Bills"
          action={
            <form action="/" className="flex flex-col gap-3 sm:flex-row">
              {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
              <input
                name="q"
                defaultValue={q}
                placeholder="Search document, customer, mobile, vehicle"
                className={cn(inputClass, "sm:w-96")}
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
          }
        />
        <CardBody className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Link
                key={filter.value}
                href={filterHref(filter.value, q)}
                className={cn(
                  "inline-flex h-10 items-center rounded-lg px-4 text-sm font-black transition",
                  type === filter.value
                    ? "bg-[#5a173b] text-white"
                    : "border border-[#e7c9c1] bg-[#fff8f2] text-[#4b1737] hover:bg-[#f4ded6]",
                )}
              >
                {filter.label}
              </Link>
            ))}
          </div>

          <DataTable
            headers={["Document", "Customer", "Vehicle", "Date", "Status", "Actions"]}
            empty="No billing documents found."
            rows={documents.map((document) => [
              <Link key="number" href={document.href} className="font-black text-[#5a173b] hover:underline">
                {document.number}
              </Link>,
              document.customerName,
              document.vehicleNumber,
              formatDate(document.sortDate),
              <Badge key="status" value={document.status} />,
              <div key="actions" className="flex items-center gap-2">
                <Link href={document.href} className={iconActionClass("view")} title="View">
                  <Eye className="h-4 w-4" />
                </Link>
                <a href={document.pdfHref} download className={iconActionClass("pdf")} title="Download PDF">
                  <FileDown className="h-4 w-4" />
                </a>
                <a
                  href={createWhatsAppLink(document.mobileNumber, document.message)}
                  target="_blank"
                  rel="noreferrer"
                  className={iconActionClass("whatsapp")}
                  title="WhatsApp Share"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>,
            ])}
          />
        </CardBody>
      </Card>
    </div>
  );
}
