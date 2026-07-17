import { Plus } from "lucide-react";
import Link from "next/link";
import { PdfDownloadIcon, PreviewIcon, WhatsAppIcon } from "@/components/action-icons";
import { StatusMessageControl } from "@/components/status-message-control";
import { Badge, Button, Card, CardBody, CardHeader, DataTable, PageHeader, inputClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { statusMessageTemplateFields } from "@/lib/status-message-templates";
import { cn } from "@/lib/utils";
import {
  createWhatsAppLink,
  estimateSharedBody,
  invoiceGeneratedBody,
  jobCardCreatedBody,
  requestAppUrl,
  statusMessageBody,
  statusMessageSentHeading,
} from "@/lib/whatsapp";

export type DocumentType = "all" | "job-card" | "estimate" | "invoice";
type Moneyish = number | string | { toString(): string };

function filterHref(type: DocumentType, q: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type !== "all") params.set("type", type);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function currentPageHref(path: string, q: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function iconActionClass(tone: "view" | "pdf" | "whatsapp") {
  return cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2",
    tone === "view" && "border-[#c8b2d3] bg-[#f5edf8] text-[#5a173b] hover:bg-[#eadce9] focus:ring-[#bca2c9]",
    tone === "pdf" && "border-[#f1b8b8] bg-[#fff0f0] text-[#c62828] hover:bg-[#ffe0e0] focus:ring-[#e05252]",
    tone === "whatsapp" && "border-[#9bd7ad] bg-[#e8f8ed] text-[#128c3a] hover:bg-[#d8f2df] focus:ring-[#25d366]",
  );
}

function sentStatusMessages(
  logs: {
    messageBody: string;
    status: string;
    statusMessageKey: string | null;
  }[],
) {
  return statusMessageTemplateFields
    .filter((template) =>
      logs.some(
        (log) =>
          log.status !== "FAILED" &&
          (log.statusMessageKey === template.status ||
            log.messageBody.includes(statusMessageSentHeading(template.status))),
      ),
    )
    .map((template) => template.status);
}

function statusFallbackLinks({
  jobCard,
  templates,
  baseUrl,
}: {
  jobCard: {
    id: string;
    customerId: string;
    jobCardNumber: string;
    trackingToken: string;
    complaints: string[];
    customComplaint: string | null;
    problemFound: string | null;
    workSuggested: string | null;
    estimatedTotalAmount: Moneyish;
    advanceAmount: Moneyish;
    balanceDue: Moneyish;
    customer: { name: string; mobile: string; whatsapp: string | null };
    vehicle: { vehicleNumber: string };
    estimates: { id: string; estimateNumber: string; totalAmount: Moneyish; balanceAmount: Moneyish }[];
    invoices: { id: string; invoiceNumber: string; totalAmount: Moneyish; paidAmount: Moneyish; balanceAmount: Moneyish }[];
  };
  templates: unknown;
  baseUrl: string;
}) {
  const latestEstimate = jobCard.estimates[0];
  const latestInvoice = jobCard.invoices[0];
  const problemSummary =
    jobCard.problemFound ||
    jobCard.workSuggested ||
    jobCard.customComplaint ||
    jobCard.complaints.join(", ") ||
    undefined;
  const context = {
    customerId: jobCard.customerId,
    jobCardId: jobCard.id,
    estimateId: latestEstimate?.id,
    invoiceId: latestInvoice?.id,
    customerName: jobCard.customer.name,
    mobileNumber: jobCard.customer.whatsapp || jobCard.customer.mobile,
    vehicleNumber: jobCard.vehicle.vehicleNumber,
    jobCardNumber: jobCard.jobCardNumber,
    estimateNumber: latestEstimate?.estimateNumber,
    invoiceNumber: latestInvoice?.invoiceNumber,
    totalAmount: latestInvoice?.totalAmount ?? latestEstimate?.totalAmount ?? jobCard.estimatedTotalAmount,
    paidAmount: latestInvoice?.paidAmount ?? jobCard.advanceAmount,
    balanceAmount: latestInvoice?.balanceAmount ?? latestEstimate?.balanceAmount ?? jobCard.balanceDue,
    amount: latestInvoice?.balanceAmount ?? latestEstimate?.balanceAmount ?? jobCard.balanceDue,
    trackingToken: jobCard.trackingToken,
    problemSummary,
    issueName: problemSummary,
    baseUrl,
  };

  return Object.fromEntries(
    statusMessageTemplateFields.map((template) => [
      template.status,
      createWhatsAppLink(context.mobileNumber, statusMessageBody(context, template.status, templates)),
    ]),
  );
}

export async function BillingWorkspace({
  searchParams,
  fixedType,
  formAction = "/",
}: {
  searchParams: Promise<{ q?: string; type?: DocumentType }>;
  fixedType?: DocumentType;
  formAction?: string;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = fixedType ?? params.type ?? "all";
  const baseUrl = await requestAppUrl();
  const returnTo = fixedType ? currentPageHref(formAction, q) : filterHref(type, q);
  const includeJobCards = type === "all" || type === "job-card";
  const includeEstimates = type === "all" || type === "estimate";
  const includeInvoices = type === "all" || type === "invoice";
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

  const [jobCards, estimates, invoices, setting] = await Promise.all([
    includeJobCards
      ? prisma.jobCard.findMany({
          where: jobCardWhere,
          include: {
            customer: true,
            vehicle: true,
            estimates: {
              select: { id: true, estimateNumber: true, totalAmount: true, balanceAmount: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            invoices: {
              select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, balanceAmount: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            whatsappLogs: {
              select: { messageBody: true, status: true, statusMessageKey: true },
              orderBy: { createdAt: "desc" },
              take: 100,
            },
          },
          orderBy: { dateTime: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    includeEstimates
      ? prisma.estimate.findMany({
          where: estimateWhere,
          include: { customer: true, vehicle: true, jobCard: true },
          orderBy: { date: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    includeInvoices
      ? prisma.invoice.findMany({
          where: invoiceWhere,
          include: { customer: true, vehicle: true, jobCard: true },
          orderBy: { invoiceDate: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    prisma.workshopSetting.findUnique({
      where: { singletonKey: "default" },
      select: { enableWhatsAppApiSending: true, statusMessageTemplates: true },
    }),
  ]);
  const apiSendingAvailable = Boolean(
    setting?.enableWhatsAppApiSending &&
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID,
  );

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
      statusNode: (
        <StatusMessageControl
          jobCardId={jobCard.id}
          currentStatus={jobCard.status}
          sentStatuses={sentStatusMessages(jobCard.whatsappLogs)}
          returnTo={returnTo}
          apiSendingAvailable={apiSendingAvailable}
          fallbackLinks={statusFallbackLinks({
            jobCard,
            templates: setting?.statusMessageTemplates,
            baseUrl,
          })}
        />
      ),
      message: jobCardCreatedBody({
        customerId: jobCard.customerId,
        jobCardId: jobCard.id,
        customerName: jobCard.customer.name,
        mobileNumber: jobCard.customer.whatsapp || jobCard.customer.mobile,
        vehicleNumber: jobCard.vehicle.vehicleNumber,
        jobCardNumber: jobCard.jobCardNumber,
        trackingToken: jobCard.trackingToken,
        baseUrl,
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
      statusNode: <Badge value={estimate.status} />,
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
        baseUrl,
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
      statusNode: <Badge value={invoice.paymentStatus} />,
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
        baseUrl,
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
            <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
              {!fixedType && type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
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
                href={fixedType && filter.value === fixedType ? currentPageHref(formAction, q) : filterHref(filter.value, q)}
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
            headers={["Document", "Customer", "Phone", "Vehicle", "Date", "Status", "Actions"]}
            empty="No billing documents found."
            rows={documents.map((document) => [
              <Link key="number" href={document.href} className="font-black text-[#5a173b] hover:underline">
                {document.number}
              </Link>,
              document.customerName,
              <a key="phone" href={`tel:${document.mobileNumber}`} className="font-black text-[#5a173b] hover:underline">
                {document.mobileNumber}
              </a>,
              document.vehicleNumber,
              formatDate(document.sortDate),
              <div key="status">{document.statusNode}</div>,
              <div key="actions" className="flex items-center gap-2">
                <Link href={document.href} className={iconActionClass("view")} title="View">
                  <PreviewIcon />
                </Link>
                <a href={document.pdfHref} download className={iconActionClass("pdf")} title="Download PDF">
                  <PdfDownloadIcon />
                </a>
                <a
                  href={createWhatsAppLink(document.mobileNumber, document.message)}
                  target="_blank"
                  rel="noreferrer"
                  className={iconActionClass("whatsapp")}
                  title="WhatsApp Share"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                </a>
              </div>,
            ])}
          />
        </CardBody>
      </Card>
    </div>
  );
}
