import {
  inspectionStatuses,
  jobCardStatuses,
  paymentModes,
  inspectionItemNames,
} from "@/lib/constants";
import {
  recordPayment,
  saveEstimate,
  saveInspection,
  saveInvoice,
  saveJobCard,
  saveSettings,
  sendCustomWhatsApp,
  updateJobCardStatus,
} from "@/lib/actions";
import { formatDateInput, formatMoney, toDateInput } from "@/lib/format";
import { statusMessageTemplateFields, statusTemplatesFromJson } from "@/lib/status-message-templates";
import { label, vehicleMakeModel } from "@/lib/utils";
import { Field, inputClass, textareaClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { JobCardPartsEditor } from "@/components/job-card-parts-editor";
import { JobCardValidationGuard } from "@/components/job-card-validation-guard";
import { LineItemsEditor } from "@/components/line-items-editor";
import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import { MapPin, Phone } from "lucide-react";

type Decimalish = number | string | { toString(): string };

type Option = {
  id: string;
  name: string;
};

type CustomerOption = Option & {
  mobile: string;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
};

type VehicleOption = {
  id: string;
  vehicleNumber: string;
  brand: string;
  model: string;
  customerId: string;
  variant?: string | null;
  fuelType?: string;
  year?: number | null;
  odometerReading?: number | null;
};

type JobCardOption = {
  id: string;
  jobCardNumber: string;
  dateTime?: Date;
  expectedDeliveryAt?: Date | null;
  serviceAdvisorName?: string | null;
  technicianName?: string | null;
  finalQcBy?: string | null;
  complaints?: string[];
  customComplaint?: string | null;
  workSuggested?: string | null;
  partsRequired?: string | null;
  advanceAmount?: Decimalish;
  customer: {
    name: string;
    mobile?: string;
    address?: string | null;
    city?: string | null;
  };
  vehicle: {
    vehicleNumber: string;
    brand?: string;
    model?: string;
    variant?: string | null;
    fuelType?: string;
    year?: number | null;
    odometerReading?: number | null;
  };
  serviceObservations?: {
    partService: string;
    description: string | null;
    category?: string | null;
    quantity: Decimalish;
    unitPrice: Decimalish;
    amount?: Decimalish;
  }[];
};

type EstimateOption = {
  id: string;
  estimateNumber: string;
  jobCardId: string;
  totalAmount: Decimalish;
  advanceReceived?: Decimalish;
  items?: LineItem[];
};

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  customer: { name: string };
  balanceAmount: Decimalish;
};

type LineItem = {
  partService?: string | null;
  description: string;
  remarks?: string | null;
  category: string;
  quantity: Decimalish;
  unitPrice: Decimalish;
  amount?: Decimalish;
};

type WorkshopSettingOption = {
  workshopName: string;
  tagline: string;
  phoneNumber: string;
  whatsappNumber: string;
  address: string;
  estimatePrefix?: string;
  invoicePrefix?: string;
} | null;

const fuelTypeOptions = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"] as const;
const gearTypeOptions = ["Manual", "Automatic", "AMT", "CVT", "DCT"] as const;
const jobCardInputClass =
  "h-11 w-full rounded-md border-[1.5px] border-[#e3c0c9] bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#8b0f2f] focus:ring-4 focus:ring-[#8b0f2f]/10";
const jobCardTextareaClass =
  "min-h-24 w-full resize-y rounded-md border-[1.5px] border-[#e3c0c9] bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#8b0f2f] focus:ring-4 focus:ring-[#8b0f2f]/10";

function valueOf(value: Decimalish | null | undefined) {
  if (value == null) return "";
  return value.toString();
}

function displayNumber(value: string | null | undefined) {
  if (!value) return "-";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits}`;
  return value;
}

function documentNumberPreview(jobCardNumber: string | undefined, prefix: string, fallback: string) {
  if (!jobCardNumber) return fallback;
  const parts = jobCardNumber.split("-");
  const year = parts.at(-2) || String(new Date().getFullYear());
  const sequence = parts.at(-1) || "0001";
  return `${prefix}-${year}-${sequence}`;
}

function categoryForObservation(observation: { partService: string; description: string | null }): "PARTS" | "LABOUR" {
  const text = `${observation.partService} ${observation.description ?? ""}`.toLowerCase();
  return /labou?r|service|check|inspection|cleaning|clean|top[- ]?up|gas filling|performance/.test(text)
    ? "LABOUR"
    : "PARTS";
}

function observationCategory(observation: { category?: string | null; partService: string; description: string | null }) {
  if (observation.category === "LABOUR" || observation.category === "SERVICE") return "LABOUR";
  if (observation.category === "PARTS" || observation.category === "OTHER") return "PARTS";
  return categoryForObservation(observation);
}

function observationsToLineItems(observations: JobCardOption["serviceObservations"] | undefined): LineItem[] {
  return (observations ?? []).map((observation) => ({
    partService: observation.partService,
    description: observation.description ?? "",
    remarks: "",
    category: observationCategory(observation),
    quantity: valueOf(observation.quantity),
    unitPrice: valueOf(observation.unitPrice),
    amount: "amount" in observation ? valueOf(observation.amount as Decimalish) : undefined,
  }));
}

function lineItemsForEditor(items: LineItem[] | undefined): LineItem[] {
  return (items ?? []).map((item) => ({
    partService: item.partService ?? "",
    description: item.description,
    remarks: item.remarks ?? "",
    category: item.category,
    quantity: valueOf(item.quantity),
    unitPrice: valueOf(item.unitPrice),
    amount: valueOf(item.amount),
  }));
}

function jobCardComplaint(jobCard: JobCardOption | undefined) {
  return [...(jobCard?.complaints ?? []), jobCard?.customComplaint].filter(Boolean).join(", ");
}

function readOnlyValue(value: ReactNode) {
  return (
    <div className="min-h-11 rounded-md border-[1.5px] border-[#ead0d7] bg-[#fff8fa] px-3 py-2 text-sm font-semibold text-slate-950">
      {value || "-"}
    </div>
  );
}

function DocumentFormHeader({
  title,
  infoTitle,
  number,
  date,
  serviceAdvisor,
  setting,
  dateFieldName,
}: {
  title: string;
  infoTitle: string;
  number: string;
  date: string;
  serviceAdvisor: string;
  setting?: WorkshopSettingOption;
  dateFieldName?: string;
}) {
  const workshopName = setting?.workshopName || "Meharban Car A/C Works";
  const tagline = setting?.tagline || "Complete Car A/C Service & Repair Specialist";
  const phoneNumber = setting?.phoneNumber || setting?.whatsappNumber || "7287948037";
  const address =
    setting?.address ||
    "Pantulugarimeda, Beside Visakha Eye Hospital, Autonagar, Old Gajuwaka, Visakhapatnam - 26";

  return (
    <div className="grid gap-5 md:grid-cols-[1.7fr_0.9fr]">
      <div className="grid items-center gap-4 sm:grid-cols-[135px_1fr]">
        <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full border-[3px] border-[#8b0f2f] bg-white p-2">
          <Image src="/logo.png" alt={`${workshopName} logo`} width={112} height={112} className="h-full w-full object-contain" priority />
        </div>
        <div className="self-center text-center sm:text-left">
          <h1 className="whitespace-nowrap text-[24px] font-black uppercase leading-none tracking-wide text-[#650820] sm:text-[32px]">
            {workshopName}
          </h1>
          <p className="mt-3 text-base font-bold text-slate-600 md:text-lg">{tagline}</p>
          <div className="mt-4 grid gap-2 text-sm font-medium text-slate-900 md:text-[15px]">
            <p className="grid grid-cols-[24px_1fr] gap-3">
              <Phone className="h-5 w-5 text-[#8b0f2f]" />
              <span>{phoneNumber}</span>
            </p>
            <p className="grid grid-cols-[24px_1fr] gap-3">
              <MapPin className="h-5 w-5 text-[#8b0f2f]" />
              <span>{address}</span>
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 rounded-lg bg-[#8b0f2f] px-5 py-3 text-center text-3xl font-black uppercase tracking-wide text-white">
          {title}
        </div>
        <section className="overflow-hidden rounded-lg border-[1.5px] border-[#d9a5b3] bg-white">
          <h2 className="bg-[#8b0f2f] py-2 text-center text-sm font-black uppercase text-white">{infoTitle}</h2>
          <div className="grid gap-3 p-3">
            <JobCardInfoRow labelText={`${title.includes("Invoice") ? "Invoice" : "Estimate"} No.`}>{readOnlyValue(number)}</JobCardInfoRow>
            <JobCardInfoRow labelText="Date">
              {dateFieldName ? (
                <input
                  name={dateFieldName}
                  defaultValue={date}
                  placeholder="DD/MM/YYYY"
                  inputMode="numeric"
                  className={jobCardInputClass}
                />
              ) : (
                readOnlyValue(date)
              )}
            </JobCardInfoRow>
            <JobCardInfoRow labelText="Service Advisor">{readOnlyValue(serviceAdvisor)}</JobCardInfoRow>
          </div>
        </section>
      </div>
    </div>
  );
}

function FormSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-lg border-[1.5px] border-[#d9a5b3] bg-white ${className}`}>
      <div className="inline-flex min-h-10 items-center rounded-br-md bg-[#8b0f2f] px-4 text-sm font-black uppercase tracking-wide text-white">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function JobCardField({
  labelText,
  children,
  className = "",
  required = false,
}: {
  labelText: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`grid gap-2 text-sm font-bold text-slate-950 ${className}`}>
      <span>
        {labelText}
        {required ? <span className="ml-1 text-[#dc2626]">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function JobCardInfoRow({ labelText, children }: { labelText: string; children: ReactNode }) {
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[140px_1fr]">
      <span className="text-sm font-bold text-slate-950">{labelText}</span>
      {children}
    </div>
  );
}

function DocumentTextRow({
  labelText,
  value,
  className = "",
}: {
  labelText: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-[145px_10px_1fr] items-start gap-2 text-sm leading-6 ${className}`}>
      <span className="font-bold text-slate-950">{labelText}</span>
      <span className="font-bold text-slate-950">:</span>
      <span className="text-slate-950">{value === null || value === undefined || value === "" ? "-" : value}</span>
    </div>
  );
}

export function JobCardForm({
  jobCard,
  customers,
  vehicles,
  setting,
}: {
  jobCard?: {
    id: string;
    jobCardNumber?: string;
    dateTime?: Date;
    customerId: string;
    vehicleId: string;
    serviceAdvisorName: string | null;
    assignedTechnicianId: string | null;
    technicianName: string | null;
    bayNumber: string | null;
    expectedDeliveryAt: Date | null;
    priority: string;
    complaints: string[];
    customComplaint: string | null;
    problemFound: string | null;
    workSuggested: string | null;
    partsRequired: string | null;
    serviceRecommendation: string | null;
    internalNotes: string | null;
    finalQcBy: string | null;
    estimatedTotalAmount: Decimalish;
    advanceAmount: Decimalish;
    balanceDue: Decimalish;
    paymentMode: string | null;
    status: string;
    customer?: {
      name: string;
      mobile: string;
      whatsapp?: string | null;
      address?: string | null;
      city?: string | null;
    };
    vehicle?: {
      vehicleNumber: string;
      brand: string;
      model: string;
      variant?: string | null;
      fuelType: string;
      year?: number | null;
      odometerReading?: number | null;
    };
    inspectionItems?: {
      name: string;
      status: string;
      remarks: string | null;
    }[];
    serviceObservations?: {
      id: string;
      partService: string;
      description: string | null;
      category?: string | null;
      quantity: Decimalish;
      unitPrice: Decimalish;
      amount: Decimalish;
    }[];
  };
  customers: CustomerOption[];
  vehicles: VehicleOption[];
  setting?: {
    workshopName: string;
    tagline: string;
    phoneNumber: string;
    whatsappNumber: string;
    address: string;
  } | null;
}) {
  const action = saveJobCard.bind(null, jobCard?.id ?? null);
  const now = new Date();
  const displayDate = formatDateInput(jobCard?.dateTime ?? now);
  const workshopName = setting?.workshopName || "Meharban Car A/C Works";
  const tagline = setting?.tagline || "Complete Car A/C Service & Repair Specialist";
  const phoneNumber = setting?.phoneNumber || setting?.whatsappNumber || "7287948037";
  const address =
    setting?.address ||
    "Pantulugarimeda, Beside Visakha Eye Hospital, Autonagar, Old Gajuwaka, Visakhapatnam - 26";
  const hasExistingRecords = Boolean(jobCard) || customers.length > 0 || vehicles.length > 0;
  const inspectionSplitIndex = Math.ceil(inspectionItemNames.length / 2);
  const inspectionRows = Array.from({ length: inspectionSplitIndex }).map((_, index) => [
    inspectionItemNames[index],
    inspectionItemNames[index + inspectionSplitIndex],
  ]);
  const inspectionByName = new Map((jobCard?.inspectionItems ?? []).map((item) => [item.name, item]));
  const selectedCustomer = jobCard?.customer ?? customers.find((customer) => customer.id === jobCard?.customerId);
  const selectedVehicle = jobCard?.vehicle ?? vehicles.find((vehicle) => vehicle.id === jobCard?.vehicleId);
  const serviceObservations =
    jobCard?.serviceObservations?.map((observation) => ({
      id: observation.id,
      partService: observation.partService,
      description: observation.description,
      category: observationCategory(observation),
      quantity: valueOf(observation.quantity),
      unitPrice: valueOf(observation.unitPrice),
      amount: valueOf(observation.amount),
    })) ?? [];

  return (
    <form id="job-card-form" action={action} noValidate autoComplete="off" className="document-lock-font mx-auto max-w-[1250px] rounded-xl border-2 border-[#d9a5b3] bg-white p-4 shadow-[0_10px_30px_rgba(139,15,47,0.15)]">
      <JobCardValidationGuard />
      <input type="hidden" name="priority" value={jobCard?.priority ?? "NORMAL"} />
      <input type="hidden" name="status" value={jobCard?.status ?? "VEHICLE_RECEIVED"} />
      <input type="hidden" name="bayNumber" value={jobCard?.bayNumber ?? ""} />
      <input type="hidden" name="problemFound" value={jobCard?.problemFound ?? ""} />
      <input type="hidden" name="serviceRecommendation" value={jobCard?.serviceRecommendation ?? ""} />
      {jobCard ? (
        <>
          <input type="hidden" name="customerId" value={jobCard.customerId} />
          <input type="hidden" name="vehicleId" value={jobCard.vehicleId} />
        </>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="grid h-[130px] w-[130px] shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-[#8b0f2f] bg-white p-2">
            <Image src="/logo.png" alt={`${workshopName} logo`} width={112} height={112} className="h-full w-full object-contain" priority />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="whitespace-nowrap text-[22px] font-black uppercase leading-none tracking-wide text-[#650820] sm:text-[34px] xl:text-[42px]">
              {workshopName}
            </h1>
            <p className="mt-3 text-base font-bold text-slate-600">{tagline}</p>
            <div className="mt-4 grid gap-2 text-sm font-medium text-slate-900">
              <p className="grid grid-cols-[24px_1fr] gap-3">
                <Phone className="h-5 w-5 text-[#8b0f2f]" />
                <span>{phoneNumber}</span>
              </p>
              <p className="grid grid-cols-[24px_1fr] gap-3">
                <MapPin className="h-5 w-5 text-[#8b0f2f]" />
                <span>{address}</span>
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 rounded-lg bg-[#8b0f2f] px-4 py-3 text-center text-2xl font-black uppercase tracking-wide text-white">
            Digital Job Card
          </div>
          <section className="overflow-hidden rounded-lg border-[1.5px] border-[#d9a5b3] bg-white">
            <h2 className="bg-[#8b0f2f] py-2 text-center text-sm font-black uppercase text-white">Job Card Information</h2>
            <div className="grid gap-3 p-3">
              <JobCardInfoRow labelText="Job Card No.">
                <input value={jobCard?.jobCardNumber ?? "Auto generated"} readOnly className={jobCardInputClass} />
              </JobCardInfoRow>
              <JobCardInfoRow labelText="Date">
                <input
                  name="jobCardDate"
                  defaultValue={displayDate}
                  placeholder="DD/MM/YYYY"
                  inputMode="numeric"
                  className={jobCardInputClass}
                />
              </JobCardInfoRow>
              <JobCardInfoRow labelText="Service Advisor">
                <input name="serviceAdvisorName" defaultValue={jobCard?.serviceAdvisorName || "Meharban"} className={jobCardInputClass} />
              </JobCardInfoRow>
            </div>
          </section>
        </div>
      </div>

      {!jobCard && hasExistingRecords ? (
        <FormSection title="Existing Records" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <JobCardField labelText="Existing customer">
              <select name="customerId" defaultValue="" className={jobCardInputClass}>
                <option value="">New customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.mobile}
                  </option>
                ))}
              </select>
            </JobCardField>
            <JobCardField labelText="Existing vehicle">
              <select name="vehicleId" defaultValue="" className={jobCardInputClass}>
                <option value="">New vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleNumber} - {vehicleMakeModel(vehicle.brand, vehicle.model)}
                  </option>
                ))}
              </select>
            </JobCardField>
          </div>
        </FormSection>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <FormSection title="Customer Details">
          <div className="grid gap-4 md:grid-cols-2">
            <JobCardField labelText="Customer Name" className="md:col-span-2" required>
              <input name="customerName" defaultValue={selectedCustomer?.name ?? ""} placeholder="Enter customer name" autoComplete="off" className={jobCardInputClass} />
            </JobCardField>
            <JobCardField labelText="Contact No." required>
              <input
                name="customerMobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                defaultValue={selectedCustomer?.mobile ?? ""}
                placeholder="10 digit mobile number"
                autoComplete="off"
                className={jobCardInputClass}
              />
            </JobCardField>
            <JobCardField labelText="Alternate No.">
              <input
                name="customerWhatsapp"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                defaultValue={selectedCustomer?.whatsapp ?? ""}
                placeholder="Optional 10 digit number"
                autoComplete="off"
                className={jobCardInputClass}
              />
            </JobCardField>
            <JobCardField labelText="Address" className="md:col-span-2">
              <textarea
                name="customerAddress"
                defaultValue={selectedCustomer?.address ?? ""}
                placeholder="Enter complete address"
                autoComplete="off"
                className={jobCardTextareaClass}
              />
            </JobCardField>
          </div>
        </FormSection>

        <FormSection title="Vehicle Details">
          <div className="grid gap-4 md:grid-cols-2">
            <JobCardField labelText="Registration Number" required>
              <input name="newVehicleNumber" defaultValue={selectedVehicle?.vehicleNumber ?? ""} placeholder="TS09EX1234" className={`${jobCardInputClass} uppercase`} />
            </JobCardField>
            <JobCardField labelText="Fuel Type" required>
              <select name="newVehicleFuelType" defaultValue={selectedVehicle?.fuelType ?? ""} className={jobCardInputClass}>
                <option value="">Select fuel type</option>
                {fuelTypeOptions.map((fuelType) => (
                  <option key={fuelType} value={fuelType}>
                    {fuelType}
                  </option>
                ))}
              </select>
            </JobCardField>
            <JobCardField labelText="Car Make / Model" required>
              <input
                name="newVehicleMakeModel"
                defaultValue={selectedVehicle ? vehicleMakeModel(selectedVehicle.brand, selectedVehicle.model) : ""}
                placeholder="Hyundai Creta"
                autoComplete="off"
                className={jobCardInputClass}
              />
            </JobCardField>
            <JobCardField labelText="Gear Type">
              <select name="newVehicleVariant" defaultValue={selectedVehicle?.variant ?? ""} className={jobCardInputClass}>
                <option value="">Select gear type</option>
                {gearTypeOptions.map((gearType) => (
                  <option key={gearType} value={gearType}>
                    {gearType}
                  </option>
                ))}
              </select>
            </JobCardField>
            <JobCardField labelText="Year">
              <input
                name="newVehicleYear"
                type="number"
                min="1980"
                max="2099"
                defaultValue={selectedVehicle?.year ?? ""}
                placeholder="2021"
                inputMode="numeric"
                className={jobCardInputClass}
              />
            </JobCardField>
            <JobCardField labelText="KM Reading">
              <input
                name="newVehicleOdometer"
                type="number"
                min="0"
                defaultValue={selectedVehicle?.odometerReading ?? ""}
                placeholder="48620"
                inputMode="numeric"
                className={jobCardInputClass}
              />
            </JobCardField>
            <JobCardField labelText="Expected Delivery Date" className="md:col-span-2">
              <input name="expectedDeliveryDate" type="date" defaultValue={toDateInput(jobCard?.expectedDeliveryAt)} className={jobCardInputClass} />
            </JobCardField>
          </div>
        </FormSection>
      </div>

      <FormSection title="Complaint / Issue Reported By Customer" className="mt-4">
        <textarea
          name="customComplaint"
          defaultValue={[...(jobCard?.complaints ?? []), jobCard?.customComplaint].filter(Boolean).join(", ")}
          placeholder="Example: A/C not cooling properly, bad smell from vents."
          className={jobCardTextareaClass}
        />
      </FormSection>

      <FormSection title="A/C System Checklist / Inspection Checklist" className="mt-4">
        <div className="overflow-x-auto">
          <table className="min-w-[1020px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#fff3f6] text-[#650820]">
                <th className="border border-[#ead0d7] px-2 py-2 text-center uppercase">S.No</th>
                <th className="border border-[#ead0d7] px-2 py-2 text-left uppercase">Item</th>
                <th className="border border-[#ead0d7] px-2 py-2 text-left uppercase">Status</th>
                <th className="border border-[#ead0d7] px-2 py-2 text-left uppercase">Remarks</th>
                <th className="border border-[#ead0d7] px-2 py-2 text-center uppercase">S.No</th>
                <th className="border border-[#ead0d7] px-2 py-2 text-left uppercase">Item</th>
                <th className="border border-[#ead0d7] px-2 py-2 text-left uppercase">Status</th>
                <th className="border border-[#ead0d7] px-2 py-2 text-left uppercase">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {inspectionRows.map(([left, right], index) => (
                <tr key={left ?? index}>
                  {[left, right].map((item, cellIndex) => (
                    item ? (
                      <Fragment key={item}>
                        <td className="border border-[#ead0d7] px-2 py-2 text-center font-bold">
                          {cellIndex === 0 ? index + 1 : index + inspectionSplitIndex + 1}
                        </td>
                        <td className="border border-[#ead0d7] px-2 py-2 font-bold">
                          <input type="hidden" name="inspectionName" value={item} />
                          {item}
                        </td>
                        <td className="border border-[#ead0d7] px-2 py-2">
                          <select name="inspectionStatus" defaultValue={inspectionByName.get(item)?.status ?? "OK"} className={jobCardInputClass}>
                            {inspectionStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status === "OK" ? "OK / Good" : status === "ATTENTION" ? "Attention" : "Not OK / Need Action"}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-[#ead0d7] px-2 py-2">
                          <input
                            name="inspectionRemarks"
                            defaultValue={inspectionByName.get(item)?.remarks ?? ""}
                            placeholder="Remarks"
                            className={jobCardInputClass}
                          />
                        </td>
                      </Fragment>
                    ) : (
                      <Fragment key={`empty-${cellIndex}`}>
                        <td className="border border-[#ead0d7] px-2 py-2" />
                        <td className="border border-[#ead0d7] px-2 py-2" />
                        <td className="border border-[#ead0d7] px-2 py-2" />
                        <td className="border border-[#ead0d7] px-2 py-2" />
                      </Fragment>
                    )
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>

      <JobCardPartsEditor
        observations={serviceObservations}
        totalAmount={valueOf(jobCard?.estimatedTotalAmount)}
        advanceAmount={valueOf(jobCard?.advanceAmount)}
        balanceDue={valueOf(jobCard?.balanceDue)}
        paymentMode={jobCard?.paymentMode}
      />

      <FormSection title="Technician / Workshop Use Only" className="mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <JobCardField labelText="Technician Name">
            <input name="technicianName" defaultValue={jobCard?.technicianName ?? ""} placeholder="Enter technician name" className={jobCardInputClass} />
          </JobCardField>
          <JobCardField labelText="Final QC By">
            <input name="finalQcBy" defaultValue={jobCard?.finalQcBy ?? ""} placeholder="Enter QC person name" className={jobCardInputClass} />
          </JobCardField>
          <JobCardField labelText="Internal Notes" className="md:col-span-2">
            <textarea name="internalNotes" defaultValue={jobCard?.internalNotes ?? ""} placeholder="Enter workshop notes" className={jobCardTextareaClass} />
          </JobCardField>
        </div>
      </FormSection>

      <FormSection title="Terms & Conditions" className="mt-4">
        <div className="grid gap-2 text-sm md:grid-cols-2">
          {[
            "No warranty on A/C gas refilling.",
            "Workshop not liable for valuables left inside the vehicle.",
            "Parts replaced have no return once fitted.",
            "Vehicle will be delivered only after full payment is received.",
            "Rework will be chargeable if due to misuse.",
            "Customer approval is required before additional work is started.",
          ].map((term) => (
            <label key={term} className="flex items-center gap-2 font-medium text-slate-700">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#d9a5b3] text-[#8b0f2f]" />
              {term}
            </label>
          ))}
        </div>
      </FormSection>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="reset"
          className="h-11 rounded-lg border-[1.5px] border-[#d9a5b3] bg-[#fff3f6] px-5 text-sm font-black text-[#8b0f2f] transition hover:bg-white"
        >
          Clear Form
        </button>
        <SubmitButton>{jobCard ? "Update job card" : "Create job card"}</SubmitButton>
      </div>
    </form>
  );
}

export function StatusUpdateForm({ jobCardId, currentStatus }: { jobCardId: string; currentStatus: string }) {
  const action = updateJobCardStatus.bind(null, jobCardId);

  return (
    <form action={action} className="grid gap-3">
      <Field labelText="New status">
        <select name="newStatus" defaultValue={currentStatus} className={inputClass}>
          {jobCardStatuses.map((status) => (
            <option key={status} value={status}>
              {label(status)}
            </option>
          ))}
        </select>
      </Field>
      <Field labelText="Remarks">
        <textarea name="remarks" className={textareaClass} />
      </Field>
      <SubmitButton>Update status</SubmitButton>
    </form>
  );
}

export function InspectionForm({
  jobCardId,
  items,
}: {
  jobCardId: string;
  items: { id: string; name: string; status: string; remarks: string | null }[];
}) {
  const action = saveInspection.bind(null, jobCardId);

  return (
    <form action={action} className="grid gap-3">
      {items.map((item) => (
        <div key={item.id} className="grid gap-3 rounded-lg border border-[#e7c9c1] bg-[#fffaf5] p-3 lg:grid-cols-[1fr_180px_1.4fr]">
          <div className="text-sm font-bold text-[#2f1233]">{item.name}</div>
          <select name={`status-${item.id}`} defaultValue={item.status} className={inputClass}>
            {inspectionStatuses.map((status) => (
              <option key={status} value={status}>
                {label(status)}
              </option>
            ))}
          </select>
          <input name={`remarks-${item.id}`} defaultValue={item.remarks ?? ""} className={inputClass} />
        </div>
      ))}
      <SubmitButton>Save inspection</SubmitButton>
    </form>
  );
}

export function EstimateForm({
  estimate,
  jobCards,
  selectedJobCardId,
  setting,
}: {
  estimate?: {
    id: string;
    estimateNumber?: string;
    jobCardId: string;
    validTill: Date | null;
    date?: Date;
    problemSummary: string;
    discount: Decimalish;
    advanceReceived: Decimalish;
    status: string;
    items: LineItem[];
  };
  jobCards: JobCardOption[];
  selectedJobCardId?: string;
  setting?: WorkshopSettingOption;
}) {
  const action = saveEstimate.bind(null, estimate?.id ?? null);
  const lockedJobCardId = estimate?.jobCardId ?? selectedJobCardId ?? "";
  const lockedJobCard = jobCards.find((jobCard) => jobCard.id === lockedJobCardId);
  const serviceAdvisorName = lockedJobCard?.serviceAdvisorName || "Meharban";
  const problemSummary = estimate?.problemSummary || jobCardComplaint(lockedJobCard) || "Estimation prepared from job card.";
  const initialItems = lineItemsForEditor(
    estimate?.items?.length ? estimate.items : observationsToLineItems(lockedJobCard?.serviceObservations),
  );
  const estimateNumber =
    estimate?.estimateNumber ||
    documentNumberPreview(lockedJobCard?.jobCardNumber, setting?.estimatePrefix || "EST", "Auto generated");
  const estimateDate = formatDateInput(estimate?.date ?? new Date());

  return (
    <form action={action} className="document-lock-font mx-auto max-w-[1120px] rounded-xl border-2 border-[#d9a5b3] bg-white p-4 shadow-[0_10px_30px_rgba(139,15,47,0.15)]">
      <input type="hidden" name="status" value={estimate?.status ?? "DRAFT"} />
      <input type="hidden" name="problemSummary" value={problemSummary} />
      <input type="hidden" name="validTill" value={toDateInput(estimate?.validTill)} />
      {lockedJobCardId ? <input type="hidden" name="jobCardId" value={lockedJobCardId} /> : null}

      <DocumentFormHeader
        title="Estimation"
        infoTitle="Estimation Information"
        number={estimateNumber}
        date={estimateDate}
        dateFieldName="estimateDate"
        serviceAdvisor={serviceAdvisorName}
        setting={setting}
      />

      {!lockedJobCardId ? (
        <FormSection title="Related Job Card" className="mt-4">
          <select name="jobCardId" required defaultValue={estimate?.jobCardId ?? selectedJobCardId ?? ""} className={jobCardInputClass}>
            <option value="">Select job card</option>
            {jobCards.map((jobCard) => (
              <option key={jobCard.id} value={jobCard.id}>
                {jobCard.jobCardNumber} - {jobCard.vehicle.vehicleNumber} - {jobCard.customer.name}
              </option>
            ))}
          </select>
        </FormSection>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-[0.72fr_1fr]">
        <FormSection title="Customer Details">
          <div className="grid gap-3 py-1">
            <DocumentTextRow labelText="Customer Name" value={lockedJobCard?.customer.name} />
            <DocumentTextRow labelText="Contact No." value={displayNumber(lockedJobCard?.customer.mobile)} />
            <DocumentTextRow labelText="Address" value={lockedJobCard?.customer.address || lockedJobCard?.customer.city || "-"} />
          </div>
        </FormSection>

        <FormSection title="Vehicle Details">
          <div className="grid gap-4 py-1 md:grid-cols-2">
            <div className="grid gap-3">
              <DocumentTextRow labelText="Reg Number" value={lockedJobCard?.vehicle.vehicleNumber} />
              <DocumentTextRow
                labelText="Car Make / Model"
                value={vehicleMakeModel(lockedJobCard?.vehicle.brand, lockedJobCard?.vehicle.model)}
              />
              <DocumentTextRow labelText="Year" value={lockedJobCard?.vehicle.year ?? "-"} />
              <DocumentTextRow
                labelText="KM Reading"
                value={lockedJobCard?.vehicle.odometerReading ? `${lockedJobCard.vehicle.odometerReading.toLocaleString("en-IN")} KM` : "-"}
              />
            </div>
            <div className="grid gap-3 md:border-l md:border-[#d9a5b3] md:pl-8">
              <DocumentTextRow labelText="Fuel Type" value={lockedJobCard?.vehicle.fuelType} />
              <DocumentTextRow labelText="Gear Type" value={lockedJobCard?.vehicle.variant || "-"} />
              <DocumentTextRow
                labelText="Delivery Date"
                value={lockedJobCard?.expectedDeliveryAt ? `${formatDateInput(lockedJobCard.expectedDeliveryAt)} (Expected)` : "-"}
              />
            </div>
          </div>
        </FormSection>
      </div>

      <FormSection title="Complaint / Issue Reported By Customer" className="mt-4">
        <p className="text-sm font-semibold leading-6 text-slate-950">{problemSummary}</p>
      </FormSection>

      <div className="mt-4">
        <LineItemsEditor items={initialItems} />
      </div>

      <FormSection title="Payment Details" className="mt-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <JobCardField labelText="Discount">
            <input name="discount" type="number" step="0.01" defaultValue={valueOf(estimate?.discount)} className={jobCardInputClass} />
          </JobCardField>
          <JobCardField labelText="Advance Received">
            <input
              name="advanceReceived"
              type="number"
              step="0.01"
              defaultValue={valueOf(estimate?.advanceReceived) || valueOf(lockedJobCard?.advanceAmount)}
              className={jobCardInputClass}
            />
          </JobCardField>
        </div>
      </FormSection>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FormSection title="Important Notes">
          <ul className="list-disc space-y-1 pl-5 text-xs font-semibold leading-5">
            <li>This estimation is valid up to the date mentioned above.</li>
            <li>Additional parts or labour may be required after inspection.</li>
            <li>Work will be started only after customer confirmation.</li>
            <li>No GST applicable.</li>
          </ul>
        </FormSection>
        <FormSection title="Terms & Conditions">
          <ul className="list-disc space-y-1 pl-5 text-xs font-semibold leading-5">
            <li>All parts are genuine / good quality.</li>
            <li>Warranty is applicable as per our policy.</li>
            <li>Estimate may change if new issues are found.</li>
            <li>Payment to be made after job completion.</li>
          </ul>
        </FormSection>
      </div>

      <div className="mt-5 flex justify-end">
        <SubmitButton>{estimate ? "Update estimate" : "Create estimate"}</SubmitButton>
      </div>
    </form>
  );
}

export function InvoiceForm({
  invoice,
  jobCards,
  estimates,
  selectedEstimate,
  selectedJobCardId,
  setting,
}: {
  invoice?: {
    id: string;
    invoiceNumber?: string;
    jobCardId: string;
    estimateId: string | null;
    invoiceDate?: Date;
    discount: Decimalish;
    paidAmount: Decimalish;
    deliveryStatus: string;
    notes: string | null;
    items: LineItem[];
  };
  jobCards: JobCardOption[];
  estimates: EstimateOption[];
  selectedEstimate?: EstimateOption | null;
  selectedJobCardId?: string;
  setting?: WorkshopSettingOption;
}) {
  const action = saveInvoice.bind(null, invoice?.id ?? null);
  const lockedJobCardId = invoice?.jobCardId ?? selectedEstimate?.jobCardId ?? selectedJobCardId ?? "";
  const lockedEstimateId = invoice?.estimateId ?? selectedEstimate?.id ?? "";
  const lockedJobCard = jobCards.find((jobCard) => jobCard.id === lockedJobCardId);
  const lockedEstimate = estimates.find((estimate) => estimate.id === lockedEstimateId);
  const serviceAdvisorName = lockedJobCard?.serviceAdvisorName || "Meharban";
  const invoiceNumber =
    invoice?.invoiceNumber ||
    documentNumberPreview(lockedJobCard?.jobCardNumber, setting?.invoicePrefix || "INV", "Auto generated");
  const invoiceDate = formatDateInput(invoice?.invoiceDate ?? new Date());
  const estimateItems = selectedEstimate?.items ?? lockedEstimate?.items;
  const initialItems = lineItemsForEditor(
    invoice?.items?.length
      ? invoice.items
      : estimateItems?.length
        ? estimateItems
        : observationsToLineItems(lockedJobCard?.serviceObservations),
  );
  const complaintText = jobCardComplaint(lockedJobCard);
  const serviceSummary = invoice?.notes || `${complaintText || "Service completed"}${complaintText ? ". " : " "}Service completed and billed as below.`;

  return (
    <form action={action} className="document-lock-font mx-auto max-w-[1120px] rounded-xl border-2 border-[#d9a5b3] bg-white p-4 shadow-[0_10px_30px_rgba(139,15,47,0.15)]">
      <DocumentFormHeader
        title="Invoice Bill"
        infoTitle="Invoice Information"
        number={invoiceNumber}
        date={invoiceDate}
        dateFieldName="invoiceDate"
        serviceAdvisor={serviceAdvisorName}
        setting={setting}
      />

      <FormSection title="Linked Documents" className="mt-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <JobCardField labelText="Job Card">
            {lockedJobCardId ? (
              <>
                <input type="hidden" name="jobCardId" value={lockedJobCardId} />
                {readOnlyValue(lockedJobCard ? `${lockedJobCard.jobCardNumber} - ${lockedJobCard.vehicle.vehicleNumber}` : lockedJobCardId)}
              </>
            ) : (
              <select
                name="jobCardId"
                required
                defaultValue={invoice?.jobCardId ?? selectedEstimate?.jobCardId ?? selectedJobCardId ?? ""}
                className={jobCardInputClass}
              >
                <option value="">Select job card</option>
                {jobCards.map((jobCard) => (
                  <option key={jobCard.id} value={jobCard.id}>
                    {jobCard.jobCardNumber} - {jobCard.vehicle.vehicleNumber}
                  </option>
                ))}
              </select>
            )}
          </JobCardField>
          <JobCardField labelText="Estimate">
            {lockedEstimateId ? (
              <>
                <input type="hidden" name="estimateId" value={lockedEstimateId} />
                {readOnlyValue(
                  selectedEstimate || lockedEstimate
                    ? `${(selectedEstimate ?? lockedEstimate)?.estimateNumber} - ${formatMoney((selectedEstimate ?? lockedEstimate)?.totalAmount)}`
                    : lockedEstimateId,
                )}
              </>
            ) : (
              <select name="estimateId" defaultValue={invoice?.estimateId ?? selectedEstimate?.id ?? ""} className={jobCardInputClass}>
                <option value="">Skipped</option>
                {estimates.map((estimate) => (
                  <option key={estimate.id} value={estimate.id}>
                    {estimate.estimateNumber} - {formatMoney(estimate.totalAmount)}
                  </option>
                ))}
              </select>
            )}
          </JobCardField>
        </div>
      </FormSection>

      <div className="mt-4 grid gap-3 md:grid-cols-[0.72fr_1fr]">
        <FormSection title="Customer Details">
          <div className="grid gap-3">
            <JobCardInfoRow labelText="Customer Name">{readOnlyValue(lockedJobCard?.customer.name)}</JobCardInfoRow>
            <JobCardInfoRow labelText="Contact No.">{readOnlyValue(displayNumber(lockedJobCard?.customer.mobile))}</JobCardInfoRow>
            <JobCardInfoRow labelText="Address">{readOnlyValue(lockedJobCard?.customer.address || lockedJobCard?.customer.city || "-")}</JobCardInfoRow>
          </div>
        </FormSection>

        <FormSection title="Vehicle Details">
          <div className="grid gap-3 md:grid-cols-2">
            <JobCardInfoRow labelText="Reg Number">{readOnlyValue(lockedJobCard?.vehicle.vehicleNumber)}</JobCardInfoRow>
            <JobCardInfoRow labelText="Fuel Type">{readOnlyValue(lockedJobCard?.vehicle.fuelType)}</JobCardInfoRow>
            <JobCardInfoRow labelText="Car Make / Model">
              {readOnlyValue(vehicleMakeModel(lockedJobCard?.vehicle.brand, lockedJobCard?.vehicle.model))}
            </JobCardInfoRow>
            <JobCardInfoRow labelText="Gear Type">{readOnlyValue(lockedJobCard?.vehicle.variant || "-")}</JobCardInfoRow>
            <JobCardInfoRow labelText="Year">{readOnlyValue(lockedJobCard?.vehicle.year ?? "-")}</JobCardInfoRow>
            <JobCardInfoRow labelText="Delivery Date">
              {readOnlyValue(lockedJobCard?.expectedDeliveryAt ? formatDateInput(lockedJobCard.expectedDeliveryAt) : "-")}
            </JobCardInfoRow>
            <JobCardInfoRow labelText="KM Reading">
              {readOnlyValue(lockedJobCard?.vehicle.odometerReading ? `${lockedJobCard.vehicle.odometerReading.toLocaleString("en-IN")} KM` : "-")}
            </JobCardInfoRow>
          </div>
        </FormSection>
      </div>

      <FormSection title="Service Summary" className="mt-4">
        <textarea name="notes" defaultValue={serviceSummary} className={jobCardTextareaClass} />
      </FormSection>

      <div className="mt-4">
        <LineItemsEditor items={initialItems} showRemarks />
      </div>

      <FormSection title="Payment Details" className="mt-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <JobCardField labelText="Discount">
            <input name="discount" type="number" step="0.01" defaultValue={valueOf(invoice?.discount)} className={jobCardInputClass} />
          </JobCardField>
          <JobCardField labelText="Paid Amount">
            <input
              name="paidAmount"
              type="number"
              step="0.01"
              defaultValue={valueOf(invoice?.paidAmount) || valueOf(selectedEstimate?.advanceReceived)}
              className={jobCardInputClass}
            />
          </JobCardField>
          <JobCardField labelText="Delivery Status">
            <input name="deliveryStatus" defaultValue={invoice?.deliveryStatus ?? "Pending"} className={jobCardInputClass} />
          </JobCardField>
        </div>
      </FormSection>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FormSection title="Important Notes">
          <ul className="list-disc space-y-1 pl-5 text-xs font-semibold leading-5">
            <li>Invoice generated after service completion.</li>
            <li>No GST applicable.</li>
            <li>Parts once fitted will not be taken back.</li>
            <li>Payment to be completed before vehicle delivery.</li>
          </ul>
        </FormSection>
        <FormSection title="Terms & Conditions">
          <ul className="list-disc space-y-1 pl-5 text-xs font-semibold leading-5">
            <li>All parts are genuine / good quality.</li>
            <li>Workshop not liable for valuables left inside the vehicle.</li>
            <li>No warranty on A/C gas refilling.</li>
            <li>Rework will be chargeable if due to misuse.</li>
          </ul>
        </FormSection>
      </div>

      <div className="mt-5 flex justify-end">
        <SubmitButton>{invoice ? "Update invoice" : "Create invoice"}</SubmitButton>
      </div>
    </form>
  );
}

export function PaymentForm({
  invoices,
  selectedInvoiceId,
}: {
  invoices: InvoiceOption[];
  selectedInvoiceId?: string;
}) {
  return (
    <form action={recordPayment} className="grid gap-4 lg:grid-cols-2">
      <Field labelText="Invoice">
        <select name="invoiceId" required defaultValue={selectedInvoiceId ?? ""} className={inputClass}>
          <option value="">Select invoice</option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber} - {invoice.customer.name} - Balance {formatMoney(invoice.balanceAmount)}
            </option>
          ))}
        </select>
      </Field>
      <Field labelText="Amount">
        <input name="amount" required type="number" step="0.01" className={inputClass} />
      </Field>
      <Field labelText="Payment mode">
        <select name="mode" defaultValue="CASH" className={inputClass}>
          {paymentModes.map((mode) => (
            <option key={mode} value={mode}>
              {label(mode)}
            </option>
          ))}
        </select>
      </Field>
      <Field labelText="Payment date">
        <input name="paymentDate" type="date" defaultValue={toDateInput(new Date())} className={inputClass} />
      </Field>
      <Field labelText="Reference number">
        <input name="referenceNumber" className={inputClass} />
      </Field>
      <Field labelText="Notes">
        <input name="notes" className={inputClass} />
      </Field>
      <div className="lg:col-span-2">
        <SubmitButton>Record payment</SubmitButton>
      </div>
    </form>
  );
}

export function WhatsAppSendForm({
  mobileNumber,
  messageBody,
  messageType = "CUSTOM",
  returnTo,
  customerId,
  jobCardId,
  estimateId,
  invoiceId,
}: {
  mobileNumber: string;
  messageBody: string;
  messageType?: string;
  returnTo: string;
  customerId?: string;
  jobCardId?: string;
  estimateId?: string;
  invoiceId?: string;
}) {
  return (
    <form action={sendCustomWhatsApp} className="grid gap-3">
      <input type="hidden" name="mobileNumber" value={mobileNumber} />
      <input type="hidden" name="messageType" value={messageType} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="customerId" value={customerId ?? ""} />
      <input type="hidden" name="jobCardId" value={jobCardId ?? ""} />
      <input type="hidden" name="estimateId" value={estimateId ?? ""} />
      <input type="hidden" name="invoiceId" value={invoiceId ?? ""} />
      <textarea name="messageBody" defaultValue={messageBody} className={textareaClass} />
      <SubmitButton>Send WhatsApp Message</SubmitButton>
    </form>
  );
}

export function SettingsForm({
  setting,
}: {
  setting: {
    workshopName: string;
    tagline: string;
    phoneNumber: string;
    whatsappNumber: string;
    email: string;
    address: string;
    logoUrl: string | null;
    invoiceFooterNote: string;
    estimateTerms: string;
    jobCardTerms: string;
    currencySymbol: string;
    statusMessageTemplates: unknown;
    jobCardPrefix: string;
    estimatePrefix: string;
    invoicePrefix: string;
    enableWhatsAppApiSending: boolean;
    enableManualWhatsAppFallback: boolean;
    autoSendJobCardMessage: boolean;
    autoSendEstimateMessage: boolean;
    autoSendInvoiceMessage: boolean;
    autoSendDeliveryMessage: boolean;
  };
}) {
  const statusTemplates = statusTemplatesFromJson(setting.statusMessageTemplates);

  return (
    <form action={saveSettings} className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field labelText="Workshop name">
          <input name="workshopName" defaultValue={setting.workshopName} className={inputClass} />
        </Field>
        <Field labelText="Tagline">
          <input name="tagline" defaultValue={setting.tagline} className={inputClass} />
        </Field>
        <Field labelText="Phone number">
          <input name="phoneNumber" defaultValue={setting.phoneNumber} className={inputClass} />
        </Field>
        <Field labelText="WhatsApp number">
          <input name="whatsappNumber" defaultValue={setting.whatsappNumber} className={inputClass} />
        </Field>
        <Field labelText="Email">
          <input name="email" defaultValue={setting.email} className={inputClass} />
        </Field>
        <Field labelText="Logo URL">
          <input name="logoUrl" defaultValue={setting.logoUrl ?? ""} className={inputClass} />
        </Field>
        <Field labelText="Address" className="lg:col-span-2">
          <textarea name="address" defaultValue={setting.address} className={textareaClass} />
        </Field>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field labelText="Invoice footer note">
          <textarea name="invoiceFooterNote" defaultValue={setting.invoiceFooterNote} className={textareaClass} />
        </Field>
        <Field labelText="Estimate terms">
          <textarea name="estimateTerms" defaultValue={setting.estimateTerms} className={textareaClass} />
        </Field>
        <Field labelText="Job card terms">
          <textarea name="jobCardTerms" defaultValue={setting.jobCardTerms} className={textareaClass} />
        </Field>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <Field labelText="Currency symbol">
          <input name="currencySymbol" defaultValue={setting.currencySymbol} className={inputClass} />
        </Field>
        <Field labelText="Job card prefix">
          <input name="jobCardPrefix" defaultValue={setting.jobCardPrefix} className={inputClass} />
        </Field>
        <Field labelText="Estimate prefix">
          <input name="estimatePrefix" defaultValue={setting.estimatePrefix} className={inputClass} />
        </Field>
        <Field labelText="Invoice prefix">
          <input name="invoicePrefix" defaultValue={setting.invoicePrefix} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-3 rounded-lg border border-[#e7c9c1] bg-[#fffaf5] p-4 lg:grid-cols-2">
        {[
          ["enableWhatsAppApiSending", "Enable WhatsApp API sending", setting.enableWhatsAppApiSending],
          ["enableManualWhatsAppFallback", "Enable manual wa.me fallback", setting.enableManualWhatsAppFallback],
          ["autoSendJobCardMessage", "Auto-send job card message", setting.autoSendJobCardMessage],
          ["autoSendEstimateMessage", "Auto-send estimate message", setting.autoSendEstimateMessage],
          ["autoSendInvoiceMessage", "Auto-send invoice message", setting.autoSendInvoiceMessage],
          ["autoSendDeliveryMessage", "Auto-send delivery message", setting.autoSendDeliveryMessage],
        ].map(([name, text, checked]) => (
          <label key={String(name)} className="flex items-center gap-3 text-sm font-bold text-[#4b1737]">
            <input
              type="checkbox"
              name={String(name)}
              defaultChecked={Boolean(checked)}
              className="h-4 w-4 rounded border-[#d7a9ad] text-[#5a173b]"
            />
            {String(text)}
          </label>
        ))}
      </div>
      <div className="grid gap-4 rounded-lg border border-[#e7c9c1] bg-[#fffaf5] p-4">
        <div>
          <h3 className="font-display text-xl font-bold text-[#2d1030]">Status Message</h3>
          <p className="mt-1 text-sm font-semibold text-[#6f475c]">
            These WhatsApp messages are used from the Home status dropdown.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {statusMessageTemplateFields.map((template) => (
            <Field key={template.status} labelText={template.title}>
              <textarea
                name={`statusMessageTemplate-${template.status}`}
                defaultValue={statusTemplates[template.status]}
                className="min-h-56 rounded-lg border border-[#e2beb8] bg-[#fffaf7] px-3 py-2 font-mono text-xs font-semibold leading-5 text-[#2f1233] outline-none transition placeholder:text-[#a88996] focus:border-[#d97873] focus:ring-2 focus:ring-[#f8cdbf]"
              />
            </Field>
          ))}
        </div>
      </div>
      <SubmitButton>Save settings</SubmitButton>
    </form>
  );
}
