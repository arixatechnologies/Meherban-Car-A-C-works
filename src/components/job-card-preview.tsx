import {
  BadgeIndianRupee,
  Car,
  Check,
  ClipboardList,
  AlertTriangle,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  Snowflake,
  UserCog,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { InspectionStatus, JobCardStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { decimalToNumber, formatDate, formatMoney } from "@/lib/format";
import { label } from "@/lib/utils";

const maroon = "bg-[#8b0f32]";
const maroonText = "text-[#7a0d2b]";
const maroonBorder = "border-[#b94b68]";
const defaultPhoneNumber = "7287948037";
const defaultAddress = "Pantulugarimeda, Beside Visakha Eye Hospital, Autonagar, Old Gajuwaka, Visakhapatnam - 26";

function displayMobile(value: string | null | undefined) {
  if (!value) return "-";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits}`;
  return value;
}

function splitNotes(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function SectionTitle({
  icon,
  title,
  suffix,
}: {
  icon: ReactNode;
  title: string;
  suffix?: string;
}) {
  return (
    <div className={`inline-flex min-h-9 items-center gap-2 rounded-br-md rounded-tl-md ${maroon} px-4 text-sm font-bold uppercase tracking-wide text-white`}>
      {icon}
      <span>{title}</span>
      {suffix ? <span className="text-[10px] font-semibold normal-case text-white/85">{suffix}</span> : null}
    </div>
  );
}

function Box({
  title,
  icon,
  suffix,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  suffix?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-lg border ${maroonBorder} bg-white ${className}`}>
      <SectionTitle title={title} icon={icon} suffix={suffix} />
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoRow({ labelText, value }: { labelText: string; value: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[118px_10px_minmax(0,1fr)] gap-2 text-[13px] leading-6">
      <dt className="font-bold text-slate-950">{labelText}</dt>
      <dd className="font-bold text-slate-700">:</dd>
      <dd className="min-w-0 break-words text-slate-950">{value || "-"}</dd>
    </div>
  );
}

function StatusMark({ status }: { status: InspectionStatus }) {
  const classes = {
    OK: "border-emerald-500 text-emerald-600",
    ATTENTION: "border-yellow-400 bg-yellow-300 text-yellow-950",
    NOT_OK: "border-red-500 text-red-600",
  }[status];

  return (
    <span className={`mx-auto grid h-5 w-5 place-items-center border-2 ${classes}`}>
      {status === "OK" ? <Check className="h-4 w-4" /> : null}
      {status === "ATTENTION" ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
      {status === "NOT_OK" ? <X className="h-4 w-4" /> : null}
    </span>
  );
}

function LegendMark({ status, text }: { status: InspectionStatus; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
      <StatusMark status={status} />
      {text}
    </div>
  );
}

function stageForStatus(status: JobCardStatus) {
  const stageMap: Record<JobCardStatus, number> = {
    VEHICLE_RECEIVED: 0,
    INSPECTION_STARTED: 1,
    ISSUE_DIAGNOSED: 1,
    ESTIMATE_SHARED: 1,
    WAITING_FOR_CUSTOMER_APPROVAL: 1,
    CUSTOMER_APPROVED: 2,
    WORK_IN_PROGRESS: 2,
    PARTS_REQUIRED: 2,
    AC_GAS_FILLING: 2,
    COOLING_TEST: 2,
    QUALITY_CHECK: 2,
    READY_FOR_DELIVERY: 3,
    INVOICE_GENERATED: 3,
    PAYMENT_PENDING: 3,
    DELIVERED: 3,
    CANCELLED: 0,
  };

  return stageMap[status] ?? 0;
}

export async function JobCardPreview({ id }: { id: string }) {
  const [jobCard, setting] = await Promise.all([
    prisma.jobCard.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        serviceAdvisor: true,
        assignedTechnician: true,
        inspectionItems: { orderBy: { createdAt: "asc" } },
        serviceObservations: { orderBy: { sortOrder: "asc" } },
        estimates: { include: { items: true }, orderBy: { createdAt: "desc" }, take: 1 },
        invoices: {
          include: { items: true, payments: { orderBy: { paymentDate: "asc" } } },
          orderBy: { invoiceDate: "desc" },
          take: 1,
        },
      },
    }),
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  if (!jobCard) notFound();

  const serviceAdvisorName = jobCard.serviceAdvisorName || jobCard.serviceAdvisor?.name || "Meharban";
  const latestInvoice = jobCard.invoices[0];
  const latestEstimate = jobCard.estimates[0];
  const invoiceOrEstimateItems = (latestInvoice?.items ?? latestEstimate?.items ?? []).map((item) => ({
    partService: item.partService || item.description,
    description: item.partService ? item.description : label(item.category),
    quantity: decimalToNumber(item.quantity),
    unitPrice: item.unitPrice,
    amount: item.amount,
  }));
  const jobCardObservationItems = jobCard.serviceObservations.map((item) => ({
    partService: item.partService,
    description: item.description ?? "-",
    quantity: decimalToNumber(item.quantity),
    unitPrice: item.unitPrice,
    amount: item.amount,
  }));
  const commercialItems = invoiceOrEstimateItems.length ? invoiceOrEstimateItems : jobCardObservationItems;
  const jobCardTotalAmount = decimalToNumber(jobCard.estimatedTotalAmount) > 0 ? jobCard.estimatedTotalAmount : undefined;
  const jobCardAdvanceAmount = decimalToNumber(jobCard.advanceAmount) > 0 ? jobCard.advanceAmount : undefined;
  const jobCardBalanceAmount = decimalToNumber(jobCard.balanceDue) > 0 ? jobCard.balanceDue : undefined;
  const totalAmount = latestInvoice?.totalAmount ?? latestEstimate?.totalAmount ?? jobCardTotalAmount;
  const advanceAmount = latestInvoice?.paidAmount ?? latestEstimate?.advanceReceived ?? jobCardAdvanceAmount;
  const balanceAmount = latestInvoice?.balanceAmount ?? latestEstimate?.balanceAmount ?? jobCardBalanceAmount;
  const paymentModes = latestInvoice?.payments.length
    ? Array.from(new Set(latestInvoice.payments.map((payment) => label(payment.mode)))).join(" / ")
    : jobCard.paymentMode
      ? label(jobCard.paymentMode)
      : "-";
  const workItems = splitNotes(jobCard.workSuggested);
  const requiredParts = splitNotes(jobCard.partsRequired);
  const terms = splitNotes(setting?.jobCardTerms);
  const workshopName = setting?.workshopName || "Meharban Car A/C Works";
  const tagline = setting?.tagline || "Complete Car A/C Service & Repair Specialist";
  const phoneNumber = setting?.phoneNumber || setting?.whatsappNumber || defaultPhoneNumber;
  const address = setting?.address || defaultAddress;
  const currentStage = stageForStatus(jobCard.status);
  const inspectionRows = Array.from({ length: Math.ceil(jobCard.inspectionItems.length / 2) }).map((_, index) => [
    jobCard.inspectionItems[index],
    jobCard.inspectionItems[index + Math.ceil(jobCard.inspectionItems.length / 2)],
  ]);
  const statusSteps = [
    "Vehicle Received",
    "Inspection Started",
    "Work In Progress",
    "Ready for Delivery",
  ];

  return (
    <article className="document-lock-font print-page mx-auto max-w-[1120px] rounded-xl border border-[#d8a1b1] bg-white p-5 text-slate-950 shadow-sm print:rounded-none print:p-4">
      <header className="grid gap-5 md:grid-cols-[1.7fr_0.9fr]">
        <div className="grid items-center gap-4 sm:grid-cols-[135px_1fr]">
          <div className={`grid h-32 w-32 place-items-center overflow-hidden rounded-full border-4 ${maroonBorder} bg-white p-2`}>
            <Image
              src="/logo.png"
              alt={`${workshopName} logo`}
              width={112}
              height={112}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="self-center">
            <h1 className={`whitespace-nowrap text-[32px] font-black uppercase leading-none tracking-wide ${maroonText}`}>
              {workshopName}
            </h1>
            <p className="mt-3 text-lg font-semibold text-slate-600">{tagline}</p>
            <div className="mt-4 grid gap-2 text-[15px]">
              <p className="flex items-center gap-3">
                <Phone className={`h-5 w-5 ${maroonText}`} />
                {phoneNumber}
              </p>
              <p className="flex items-start gap-3">
                <MapPin className={`mt-0.5 h-5 w-5 ${maroonText}`} />
                <span>{address}</span>
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className={`mb-3 rounded-lg ${maroon} px-5 py-3 text-center text-3xl font-black uppercase tracking-wide text-white`}>
            Digital Job Card
          </div>
          <section className={`overflow-hidden rounded-lg border ${maroonBorder}`}>
            <div className={`${maroon} py-2 text-center text-sm font-bold uppercase text-white`}>Job Card Information</div>
            <dl className="grid gap-1 p-4 text-[13px]">
              <InfoRow labelText="Job Card No." value={jobCard.jobCardNumber} />
              <InfoRow labelText="Date" value={formatDate(jobCard.dateTime)} />
              <InfoRow labelText="Service Advisor" value={serviceAdvisorName} />
            </dl>
          </section>
        </div>
      </header>

      <div className="mt-4 grid gap-3 md:grid-cols-[0.9fr_1.35fr]">
        <Box title="Customer Details" icon={<UserRound className="h-5 w-5" />}>
          <dl className="grid gap-1">
            <InfoRow labelText="Customer Name" value={jobCard.customer.name} />
            <InfoRow labelText="Contact No." value={displayMobile(jobCard.customer.mobile)} />
            <InfoRow labelText="Address" value={jobCard.customer.address || jobCard.customer.city || "-"} />
          </dl>
        </Box>

        <Box title="Vehicle Details" icon={<Car className="h-5 w-5" />}>
          <dl className="grid gap-x-6 gap-y-1 md:grid-cols-2">
            <InfoRow labelText="Reg Number" value={jobCard.vehicle.vehicleNumber} />
            <InfoRow labelText="Fuel Type" value={jobCard.vehicle.fuelType} />
            <InfoRow labelText="Car Make / Model" value={`${jobCard.vehicle.brand} ${jobCard.vehicle.model}`} />
            <InfoRow labelText="Gear Type" value={jobCard.vehicle.variant || "-"} />
            <InfoRow labelText="Year" value={jobCard.vehicle.year ?? "-"} />
            <InfoRow labelText="Delivery Date" value={jobCard.expectedDeliveryAt ? `${formatDate(jobCard.expectedDeliveryAt)} (Expected)` : "-"} />
            <InfoRow labelText="KM Reading" value={jobCard.vehicle.odometerReading ? `${jobCard.vehicle.odometerReading.toLocaleString("en-IN")} KM` : "-"} />
          </dl>
        </Box>
      </div>

      <Box
        title="Complaint / Issue Reported By Customer"
        icon={<MessageCircle className="h-5 w-5" />}
        className="mt-3"
      >
        <p className="text-[14px] leading-6">
          {[...jobCard.complaints, jobCard.customComplaint].filter(Boolean).join(", ") || "-"}
        </p>
      </Box>

      <Box
        title="A/C System Checklist / Inspection Checklist"
        icon={<Snowflake className="h-5 w-5" />}
        className="mt-3"
      >
        {inspectionRows.length ? (
          <>
            <table className="w-full border-collapse text-[12px]">
              <thead className="bg-[#fbedf2] text-[#7a0d2b]">
                <tr>
                  <th className="border border-[#ead0d8] px-2 py-2 text-left">Item</th>
                  <th className="border border-[#ead0d8] px-2 py-2 text-center">Status</th>
                  <th className="border border-[#ead0d8] px-2 py-2 text-left">Remarks</th>
                  <th className="border border-[#ead0d8] px-2 py-2 text-left">Item</th>
                  <th className="border border-[#ead0d8] px-2 py-2 text-center">Status</th>
                  <th className="border border-[#ead0d8] px-2 py-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {inspectionRows.map(([left, right], index) => (
                  <tr key={left?.id ?? index}>
                    <td className="border border-[#ead0d8] px-2 py-1.5 font-bold">{left?.name ?? ""}</td>
                    <td className="border border-[#ead0d8] px-2 py-1.5 text-center">
                      {left ? <StatusMark status={left.status} /> : null}
                    </td>
                    <td className="border border-[#ead0d8] px-2 py-1.5">{left?.remarks || "-"}</td>
                    <td className="border border-[#ead0d8] px-2 py-1.5 font-bold">{right?.name ?? ""}</td>
                    <td className="border border-[#ead0d8] px-2 py-1.5 text-center">
                      {right ? <StatusMark status={right.status} /> : null}
                    </td>
                    <td className="border border-[#ead0d8] px-2 py-1.5">{right?.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex flex-wrap justify-center gap-10">
              <LegendMark status="OK" text="OK / Good" />
              <LegendMark status="ATTENTION" text="Attention" />
              <LegendMark status="NOT_OK" text="Not OK / Need Action" />
            </div>
          </>
        ) : (
          <p className="text-sm">No inspection items found.</p>
        )}
      </Box>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Box title="Work To Be Done" icon={<Wrench className="h-5 w-5" />}>
          <ul className="list-disc space-y-1 pl-5 text-[13px] leading-5">
            {(workItems.length ? workItems : ["Inspection and diagnosis as per customer complaint."]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Box>

        <Box
          title="Required Parts / Materials"
          suffix="(Need to be required)"
          icon={<Package className="h-5 w-5" />}
        >
          <ul className="list-disc space-y-1 pl-5 text-[13px] leading-5">
            {(requiredParts.length ? requiredParts : ["To be updated after inspection."]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Box>
      </div>

      <section className={`mt-3 overflow-hidden rounded-lg border ${maroonBorder}`}>
        <div className={`${maroon} py-2 text-center text-sm font-bold uppercase tracking-wide text-white`}>
          Spare Parts / Service Observation
        </div>
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-[#fbedf2] text-[#7a0d2b]">
            <tr>
              <th className="border border-[#ead0d8] px-2 py-2">Sr. No.</th>
              <th className="border border-[#ead0d8] px-2 py-2">Part / Service</th>
              <th className="border border-[#ead0d8] px-2 py-2">Description</th>
              <th className="border border-[#ead0d8] px-2 py-2">Qty.</th>
              <th className="border border-[#ead0d8] px-2 py-2">Unit Price</th>
              <th className="border border-[#ead0d8] px-2 py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {commercialItems.length ? (
              commercialItems.map((item, index) => (
                <tr key={`${item.description}-${index}`}>
                  <td className="border border-[#ead0d8] px-2 py-1.5 text-center">{index + 1}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5 text-center">{item.partService}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5">{item.description}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5 text-center">{item.quantity}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5 text-right">{formatMoney(item.unitPrice)}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5 text-right">{formatMoney(item.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-[#ead0d8] px-2 py-4 text-center" colSpan={6}>
                  Service observation will be updated after estimate or invoice is prepared.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-[#fbedf2] text-base font-black text-[#7a0d2b]">
              <td colSpan={5} className="border border-[#ead0d8] px-3 py-2 text-right uppercase">Total</td>
              <td className="border border-[#ead0d8] px-3 py-2 text-right">{totalAmount ? formatMoney(totalAmount) : "-"}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className={`mt-3 grid overflow-hidden rounded-lg border ${maroonBorder} md:grid-cols-[190px_1fr]`}>
        <div className={`${maroon} flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase text-white`}>
          <BadgeIndianRupee className="h-5 w-5" />
          Payment Details
        </div>
        <dl className="grid gap-3 px-4 py-3 text-[12px] font-semibold sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-2">
          <InfoRow labelText="Total Amount" value={totalAmount ? formatMoney(totalAmount) : "-"} />
          <InfoRow labelText="Payment Mode" value={paymentModes} />
          <InfoRow labelText="Advance" value={advanceAmount ? formatMoney(advanceAmount) : "-"} />
          <InfoRow labelText="Balance Due" value={balanceAmount ? formatMoney(balanceAmount) : "-"} />
        </dl>
      </section>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Box title="Technician / Workshop Use Only" icon={<UserCog className="h-5 w-5" />}>
          <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
            <InfoRow labelText="Technician Name" value={jobCard.technicianName || jobCard.assignedTechnician?.name || "-"} />
            <InfoRow labelText="Final QC By" value={jobCard.finalQcBy || "________________"} />
          </dl>
        </Box>

        <Box title="Work Status" icon={<ClipboardList className="h-5 w-5" />}>
          <div className="grid grid-cols-4 items-start gap-2 text-center text-[11px] font-bold">
            {statusSteps.map((step, index) => {
              const active = index <= currentStage;
              return (
                <div key={step} className="relative">
                  {index > 0 ? <span className="absolute right-1/2 top-4 h-px w-full border-t border-dashed border-slate-500" /> : null}
                  <span
                    className={`relative z-10 mx-auto grid h-8 w-8 place-items-center rounded-full border-2 bg-white ${
                      active ? "border-[#8b0f32] text-[#8b0f32]" : "border-slate-400 text-slate-400"
                    }`}
                  >
                    {active ? <Check className="h-5 w-5" /> : null}
                  </span>
                  <p className={active ? maroonText : "text-slate-500"}>{step}</p>
                </div>
              );
            })}
          </div>
        </Box>
      </div>

      <footer className="mt-3 grid gap-3 md:grid-cols-[1fr_250px]">
        <section className={`grid overflow-hidden rounded-lg border ${maroonBorder} md:grid-cols-[165px_1fr]`}>
          <div className={`${maroon} flex items-center justify-center gap-2 px-4 py-3 text-center text-sm font-bold uppercase text-white`}>
            <ShieldCheck className="h-7 w-7" />
            Terms & Conditions
          </div>
          <ul className="grid gap-x-8 gap-y-1 px-4 py-3 text-[11px] leading-5 md:grid-cols-2">
            {[
              "No warranty on A/C gas refilling.",
              "Parts replaced have no return once fitted.",
              "Rework will be chargeable if due to misuse.",
              "Workshop not liable for valuables left inside the vehicle.",
              "Vehicle will be delivered only after full payment is received.",
              terms[0] || "Customer approval is required before additional work is started.",
            ].map((term) => (
              <li key={term} className="flex gap-2">
                <Check className={`mt-1 h-3 w-3 shrink-0 ${maroonText}`} />
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`flex items-center gap-4 rounded-lg border ${maroonBorder} p-4`}>
          <Snowflake className={`h-16 w-16 ${maroonText}`} />
          <div>
            <p className={`text-2xl font-black italic ${maroonText}`}>Thank you!</p>
            <p className="text-xs font-semibold">For choosing</p>
            <p className={`text-xs font-black uppercase ${maroonText}`}>{workshopName}</p>
          </div>
        </section>
      </footer>
    </article>
  );
}
