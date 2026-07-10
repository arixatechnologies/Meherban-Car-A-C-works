import {
  inspectionStatuses,
  itemCategories,
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
import { formatMoney, toDateInput } from "@/lib/format";
import { label } from "@/lib/utils";
import { Field, inputClass, textareaClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { JobCardPartsEditor } from "@/components/job-card-parts-editor";
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
};

type VehicleOption = {
  id: string;
  vehicleNumber: string;
  brand: string;
  model: string;
  customerId: string;
};

type JobCardOption = {
  id: string;
  jobCardNumber: string;
  customer: { name: string };
  vehicle: { vehicleNumber: string };
};

type EstimateOption = {
  id: string;
  estimateNumber: string;
  jobCardId: string;
  totalAmount: Decimalish;
  items?: LineItem[];
};

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  customer: { name: string };
  balanceAmount: Decimalish;
};

type LineItem = {
  description: string;
  category: string;
  quantity: Decimalish;
  unitPrice: Decimalish;
};

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

function lineRows(items: LineItem[] = []) {
  const rows = [...items];
  while (rows.length < 10) {
    rows.push({ description: "", category: "SERVICE", quantity: "", unitPrice: "" });
  }
  return rows;
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
}: {
  labelText: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-bold text-slate-950 ${className}`}>
      <span>{labelText}</span>
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
    serviceObservations?: {
      id: string;
      partService: string;
      description: string | null;
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
  const displayDate = toDateInput(jobCard?.dateTime ?? now);
  const workshopName = setting?.workshopName || "Meherban Car A/C Works";
  const tagline = setting?.tagline || "Complete Car A/C Service & Repair Specialist";
  const phoneNumber = setting?.phoneNumber || setting?.whatsappNumber || "7287948037";
  const address =
    setting?.address ||
    "Pantulugarimeda, Beside Visakha Eye Hospital, Autonagar, Old Gajuwaka, Visakhapatnam - 26";
  const hasExistingRecords = Boolean(jobCard) || customers.length > 0 || vehicles.length > 0;
  const inspectionRows = Array.from({ length: Math.ceil(inspectionItemNames.length / 2) }).map((_, index) => [
    inspectionItemNames[index],
    inspectionItemNames[index + Math.ceil(inspectionItemNames.length / 2)],
  ]);
  const serviceObservations =
    jobCard?.serviceObservations?.map((observation) => ({
      id: observation.id,
      partService: observation.partService,
      description: observation.description,
      quantity: valueOf(observation.quantity),
      unitPrice: valueOf(observation.unitPrice),
      amount: valueOf(observation.amount),
    })) ?? [];

  return (
    <form action={action} className="mx-auto max-w-[1250px] rounded-xl border-2 border-[#d9a5b3] bg-white p-4 shadow-[0_10px_30px_rgba(139,15,47,0.15)]">
      <input type="hidden" name="priority" value={jobCard?.priority ?? "NORMAL"} />
      <input type="hidden" name="status" value={jobCard?.status ?? "VEHICLE_RECEIVED"} />
      <input type="hidden" name="bayNumber" value={jobCard?.bayNumber ?? ""} />
      <input type="hidden" name="problemFound" value={jobCard?.problemFound ?? ""} />
      <input type="hidden" name="serviceRecommendation" value={jobCard?.serviceRecommendation ?? ""} />
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
                <input value={displayDate} readOnly className={jobCardInputClass} />
              </JobCardInfoRow>
              <JobCardInfoRow labelText="Service Advisor">
                <input name="serviceAdvisorName" defaultValue={jobCard?.serviceAdvisorName || "Meherban"} className={jobCardInputClass} />
              </JobCardInfoRow>
            </div>
          </section>
        </div>
      </div>

      {hasExistingRecords ? (
        <FormSection title="Existing Records" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <JobCardField labelText="Existing customer">
              <select name="customerId" defaultValue={jobCard?.customerId ?? ""} className={jobCardInputClass}>
                <option value="">New customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.mobile}
                  </option>
                ))}
              </select>
            </JobCardField>
            <JobCardField labelText="Existing vehicle">
              <select name="vehicleId" defaultValue={jobCard?.vehicleId ?? ""} className={jobCardInputClass}>
                <option value="">New vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleNumber} - {vehicle.brand} {vehicle.model}
                  </option>
                ))}
              </select>
            </JobCardField>
          </div>
        </FormSection>
      ) : null}

      {!jobCard ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
          <FormSection title="Customer Details">
            <div className="grid gap-4 md:grid-cols-2">
              <JobCardField labelText="Customer Name" className="md:col-span-2">
                <input name="customerName" placeholder="Enter customer name" autoComplete="name" className={jobCardInputClass} />
              </JobCardField>
              <JobCardField labelText="Contact No.">
                <input name="customerMobile" type="tel" inputMode="tel" placeholder="Enter mobile number" autoComplete="tel" className={jobCardInputClass} />
              </JobCardField>
              <JobCardField labelText="Alternate No.">
                <input name="customerWhatsapp" type="tel" inputMode="tel" placeholder="Optional" className={jobCardInputClass} />
              </JobCardField>
              <JobCardField labelText="Address" className="md:col-span-2">
                <textarea name="customerAddress" placeholder="Enter complete address" autoComplete="street-address" className={jobCardTextareaClass} />
              </JobCardField>
            </div>
          </FormSection>

          <FormSection title="Vehicle Details">
            <div className="grid gap-4 md:grid-cols-2">
              <JobCardField labelText="Registration Number">
                <input name="newVehicleNumber" placeholder="TS09EX1234" className={`${jobCardInputClass} uppercase`} />
              </JobCardField>
              <JobCardField labelText="Fuel Type">
                <select name="newVehicleFuelType" defaultValue="" className={jobCardInputClass}>
                  <option value="">Select fuel type</option>
                  {fuelTypeOptions.map((fuelType) => (
                    <option key={fuelType} value={fuelType}>
                      {fuelType}
                    </option>
                  ))}
                </select>
              </JobCardField>
              <JobCardField labelText="Car Make / Model">
                <input name="newVehicleMakeModel" placeholder="Hyundai Creta" autoComplete="off" className={jobCardInputClass} />
              </JobCardField>
              <JobCardField labelText="Gear Type">
                <select name="newVehicleVariant" defaultValue="" className={jobCardInputClass}>
                  <option value="">Select gear type</option>
                  {gearTypeOptions.map((gearType) => (
                    <option key={gearType} value={gearType}>
                      {gearType}
                    </option>
                  ))}
                </select>
              </JobCardField>
              <JobCardField labelText="Year">
                <input name="newVehicleYear" type="number" min="1980" max="2099" placeholder="2021" inputMode="numeric" className={jobCardInputClass} />
              </JobCardField>
              <JobCardField labelText="KM Reading">
                <input name="newVehicleOdometer" type="number" min="0" placeholder="48620" inputMode="numeric" className={jobCardInputClass} />
              </JobCardField>
              <JobCardField labelText="Expected Delivery Date" className="md:col-span-2">
                <input name="expectedDeliveryDate" type="date" className={jobCardInputClass} />
              </JobCardField>
            </div>
          </FormSection>
        </div>
      ) : null}

      <FormSection title="Complaint / Issue Reported By Customer" className="mt-4">
        <textarea
          name="customComplaint"
          defaultValue={[...(jobCard?.complaints ?? []), jobCard?.customComplaint].filter(Boolean).join(", ")}
          placeholder="Example: A/C not cooling properly, bad smell from vents."
          className={jobCardTextareaClass}
        />
      </FormSection>

      {!jobCard ? (
        <FormSection title="A/C System Checklist / Inspection Checklist" className="mt-4">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#fff3f6] text-[#650820]">
                  <th className="border border-[#ead0d7] px-2 py-2 text-left uppercase">Item</th>
                  <th className="border border-[#ead0d7] px-2 py-2 text-left uppercase">Status</th>
                  <th className="border border-[#ead0d7] px-2 py-2 text-left uppercase">Remarks</th>
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
                          <td className="border border-[#ead0d7] px-2 py-2 font-bold">
                            <input type="hidden" name="inspectionName" value={item} />
                            {item}
                          </td>
                          <td className="border border-[#ead0d7] px-2 py-2">
                            <select name="inspectionStatus" defaultValue="OK" className={jobCardInputClass}>
                              {inspectionStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status === "OK" ? "OK / Good" : status === "ATTENTION" ? "Attention" : "Not OK / Need Action"}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="border border-[#ead0d7] px-2 py-2">
                            <input name="inspectionRemarks" placeholder="Remarks" className={jobCardInputClass} />
                          </td>
                        </Fragment>
                      ) : (
                        <Fragment key={`empty-${cellIndex}`}>
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
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FormSection title="Work To Be Done">
          <textarea name="workSuggested" defaultValue={jobCard?.workSuggested ?? ""} placeholder="Enter work to be done" className="min-h-[120px] w-full resize-y rounded-md border-[1.5px] border-[#e3c0c9] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b0f2f] focus:ring-4 focus:ring-[#8b0f2f]/10" />
        </FormSection>
        <FormSection title="Required Parts / Materials">
          <textarea name="partsRequired" defaultValue={jobCard?.partsRequired ?? ""} placeholder="Enter required parts / materials" className="min-h-[120px] w-full resize-y rounded-md border-[1.5px] border-[#e3c0c9] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b0f2f] focus:ring-4 focus:ring-[#8b0f2f]/10" />
        </FormSection>
      </div>

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
        <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[1fr_180px_1.4fr]">
          <div className="text-sm font-semibold text-slate-900">{item.name}</div>
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

export function LineItemsEditor({ items }: { items?: LineItem[] }) {
  return (
    <div className="grid gap-3">
      <div className="hidden grid-cols-[1.5fr_160px_120px_140px] gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
        <span>Part / Service</span>
        <span>Category</span>
        <span>Quantity</span>
        <span>Unit price</span>
      </div>
      {lineRows(items).map((item, index) => (
        <div key={index} className="grid gap-3 lg:grid-cols-[1.5fr_160px_120px_140px]">
          <input name="itemDescription" defaultValue={item.description} placeholder="Description" className={inputClass} />
          <select name="itemCategory" defaultValue={item.category} className={inputClass}>
            {itemCategories.map((category) => (
              <option key={category} value={category}>
                {label(category)}
              </option>
            ))}
          </select>
          <input
            name="itemQuantity"
            defaultValue={valueOf(item.quantity)}
            placeholder="Qty"
            className={inputClass}
          />
          <input
            name="itemUnitPrice"
            type="number"
            step="0.01"
            defaultValue={valueOf(item.unitPrice)}
            placeholder="Unit price"
            className={inputClass}
          />
        </div>
      ))}
    </div>
  );
}

export function EstimateForm({
  estimate,
  jobCards,
  selectedJobCardId,
}: {
  estimate?: {
    id: string;
    jobCardId: string;
    validTill: Date | null;
    problemSummary: string;
    discount: Decimalish;
    advanceReceived: Decimalish;
    status: string;
    items: LineItem[];
  };
  jobCards: JobCardOption[];
  selectedJobCardId?: string;
}) {
  const action = saveEstimate.bind(null, estimate?.id ?? null);
  const lockedJobCardId = estimate?.jobCardId ?? selectedJobCardId ?? "";
  const lockedJobCard = jobCards.find((jobCard) => jobCard.id === lockedJobCardId);

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="status" value={estimate?.status ?? "DRAFT"} />
      <input type="hidden" name="problemSummary" value={estimate?.problemSummary ?? ""} />
      <input type="hidden" name="validTill" value={toDateInput(estimate?.validTill)} />

      {lockedJobCardId ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          <input type="hidden" name="jobCardId" value={lockedJobCardId} />
          Job Card: {lockedJobCard ? `${lockedJobCard.jobCardNumber} - ${lockedJobCard.vehicle.vehicleNumber} - ${lockedJobCard.customer.name}` : lockedJobCardId}
        </div>
      ) : (
        <Field labelText="Related job card">
          <select name="jobCardId" required defaultValue={estimate?.jobCardId ?? selectedJobCardId ?? ""} className={inputClass}>
            <option value="">Select job card</option>
            {jobCards.map((jobCard) => (
              <option key={jobCard.id} value={jobCard.id}>
                {jobCard.jobCardNumber} - {jobCard.vehicle.vehicleNumber} - {jobCard.customer.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <LineItemsEditor items={estimate?.items} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Field labelText="Discount">
          <input name="discount" type="number" step="0.01" defaultValue={valueOf(estimate?.discount)} className={inputClass} />
        </Field>
        <Field labelText="Advance received">
          <input
            name="advanceReceived"
            type="number"
            step="0.01"
            defaultValue={valueOf(estimate?.advanceReceived)}
            className={inputClass}
          />
        </Field>
      </div>
      <SubmitButton>{estimate ? "Update estimate" : "Create estimate"}</SubmitButton>
    </form>
  );
}

export function InvoiceForm({
  invoice,
  jobCards,
  estimates,
  selectedEstimate,
  selectedJobCardId,
}: {
  invoice?: {
    id: string;
    jobCardId: string;
    estimateId: string | null;
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
}) {
  const action = saveInvoice.bind(null, invoice?.id ?? null);
  const lockedJobCardId = invoice?.jobCardId ?? selectedEstimate?.jobCardId ?? selectedJobCardId ?? "";
  const lockedEstimateId = invoice?.estimateId ?? selectedEstimate?.id ?? "";
  const lockedJobCard = jobCards.find((jobCard) => jobCard.id === lockedJobCardId);

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <Field labelText="Job card">
          {lockedJobCardId ? (
            <>
              <input type="hidden" name="jobCardId" value={lockedJobCardId} />
              <div className="grid h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                {lockedJobCard ? `${lockedJobCard.jobCardNumber} - ${lockedJobCard.vehicle.vehicleNumber}` : lockedJobCardId}
              </div>
            </>
          ) : (
            <select
              name="jobCardId"
              required
              defaultValue={invoice?.jobCardId ?? selectedEstimate?.jobCardId ?? selectedJobCardId ?? ""}
              className={inputClass}
            >
              <option value="">Select job card</option>
              {jobCards.map((jobCard) => (
                <option key={jobCard.id} value={jobCard.id}>
                  {jobCard.jobCardNumber} - {jobCard.vehicle.vehicleNumber}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field labelText="Estimate">
          {lockedEstimateId ? (
            <>
              <input type="hidden" name="estimateId" value={lockedEstimateId} />
              <div className="grid h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                {selectedEstimate ? `${selectedEstimate.estimateNumber} - ${formatMoney(selectedEstimate.totalAmount)}` : lockedEstimateId}
              </div>
            </>
          ) : (
            <select name="estimateId" defaultValue={invoice?.estimateId ?? selectedEstimate?.id ?? ""} className={inputClass}>
              <option value="">Skipped</option>
              {estimates.map((estimate) => (
                <option key={estimate.id} value={estimate.id}>
                  {estimate.estimateNumber} - {formatMoney(estimate.totalAmount)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field labelText="Delivery status">
          <input name="deliveryStatus" defaultValue={invoice?.deliveryStatus ?? "Pending"} className={inputClass} />
        </Field>
      </div>
      <LineItemsEditor items={invoice?.items ?? selectedEstimate?.items} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Field labelText="Discount">
          <input name="discount" type="number" step="0.01" defaultValue={valueOf(invoice?.discount)} className={inputClass} />
        </Field>
        <Field labelText="Paid amount">
          <input name="paidAmount" type="number" step="0.01" defaultValue={valueOf(invoice?.paidAmount)} className={inputClass} />
        </Field>
        <Field labelText="Notes">
          <input name="notes" defaultValue={invoice?.notes ?? ""} className={inputClass} />
        </Field>
      </div>
      <SubmitButton>{invoice ? "Update invoice" : "Create invoice"}</SubmitButton>
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
      <div className="grid gap-3 rounded-lg border border-slate-200 p-4 lg:grid-cols-2">
        {[
          ["enableWhatsAppApiSending", "Enable WhatsApp API sending", setting.enableWhatsAppApiSending],
          ["enableManualWhatsAppFallback", "Enable manual wa.me fallback", setting.enableManualWhatsAppFallback],
          ["autoSendJobCardMessage", "Auto-send job card message", setting.autoSendJobCardMessage],
          ["autoSendEstimateMessage", "Auto-send estimate message", setting.autoSendEstimateMessage],
          ["autoSendInvoiceMessage", "Auto-send invoice message", setting.autoSendInvoiceMessage],
          ["autoSendDeliveryMessage", "Auto-send delivery message", setting.autoSendDeliveryMessage],
        ].map(([name, text, checked]) => (
          <label key={String(name)} className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name={String(name)}
              defaultChecked={Boolean(checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600"
            />
            {String(text)}
          </label>
        ))}
      </div>
      <SubmitButton>Save settings</SubmitButton>
    </form>
  );
}
