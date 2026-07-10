import { Award, Check, Clock, MapPin, Phone, Settings, Snowflake, UserCog } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

type Decimalish = number | string | { toString(): string } | null | undefined;

export const maroon = "bg-[#8b0f32]";
export const maroonText = "text-[#7a0d2b]";
export const maroonBorder = "border-[#b94b68]";
const defaultPhoneNumber = "7287948037";
const defaultAddress = "Pantulugarimeda, Beside Visakha Eye Hospital, Autonagar, Old Gajuwaka, Visakhapatnam - 26";

export function moneyText(value: Decimalish) {
  const amount = value == null ? 0 : Number(value.toString());
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function displayMobile(value: string | null | undefined) {
  if (!value) return "-";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits}`;
  return value;
}

export function splitNotes(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function InfoRow({ labelText, value }: { labelText: string; value: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[136px_10px_minmax(0,1fr)] gap-2 text-[13px] leading-6">
      <dt className="font-bold text-slate-950">{labelText}</dt>
      <dd className="font-bold text-slate-700">:</dd>
      <dd className="min-w-0 break-words text-slate-950">{value || "-"}</dd>
    </div>
  );
}

export function SectionTitle({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className={`inline-flex min-h-9 items-center gap-2 rounded-br-md rounded-tl-md ${maroon} px-4 text-sm font-bold uppercase tracking-wide text-white`}>
      {icon}
      <span>{title}</span>
    </div>
  );
}

export function DocBox({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-lg border ${maroonBorder} bg-white ${className}`}>
      <SectionTitle title={title} icon={icon} />
      <div className="p-4">{children}</div>
    </section>
  );
}

export function DocumentHeader({
  title,
  infoTitle,
  rows,
  setting,
}: {
  title: string;
  infoTitle: string;
  rows: { label: string; value: ReactNode }[];
  setting?: {
    workshopName: string;
    tagline: string;
    phoneNumber: string;
    whatsappNumber: string;
    address: string;
  } | null;
}) {
  const workshopName = setting?.workshopName || "Meharban Car A/C Works";
  const tagline = setting?.tagline || "Complete Car A/C Service & Repair Specialist";
  const phoneNumber = setting?.phoneNumber || setting?.whatsappNumber || defaultPhoneNumber;
  const address = setting?.address || defaultAddress;

  return (
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
          {title}
        </div>
        <section className={`overflow-hidden rounded-lg border ${maroonBorder}`}>
          <div className={`${maroon} py-2 text-center text-sm font-bold uppercase text-white`}>{infoTitle}</div>
          <dl className="grid gap-1 p-4 text-[13px]">
            {rows.map((row) => (
              <InfoRow key={row.label} labelText={row.label} value={row.value} />
            ))}
          </dl>
        </section>
      </div>
    </header>
  );
}

export function CustomerVehicleBlocks({
  customer,
  vehicle,
  deliveryDate,
}: {
  customer: {
    name: string;
    mobile: string;
    address: string | null;
    city: string | null;
  };
  vehicle: {
    vehicleNumber: string;
    brand: string;
    model: string;
    variant: string | null;
    fuelType: string;
    year: number | null;
    odometerReading: number | null;
  };
  deliveryDate: ReactNode;
}) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-[0.72fr_1fr]">
      <DocBox title="Customer Details" icon={<UserCog className="h-5 w-5" />}>
        <dl className="grid gap-1">
          <InfoRow labelText="Customer Name" value={customer.name} />
          <InfoRow labelText="Contact No." value={displayMobile(customer.mobile)} />
          <InfoRow labelText="Address" value={customer.address || customer.city || "-"} />
        </dl>
      </DocBox>

      <DocBox title="Vehicle Details" icon={<Settings className="h-5 w-5" />}>
        <dl className="grid gap-x-6 gap-y-1 md:grid-cols-2">
          <InfoRow labelText="Reg Number" value={vehicle.vehicleNumber} />
          <InfoRow labelText="Fuel Type" value={vehicle.fuelType} />
          <InfoRow labelText="Car Make / Model" value={`${vehicle.brand} ${vehicle.model}`} />
          <InfoRow labelText="Gear Type" value={vehicle.variant || "-"} />
          <InfoRow labelText="Year" value={vehicle.year ?? "-"} />
          <InfoRow labelText="Delivery Date" value={deliveryDate} />
          <InfoRow labelText="KM Reading" value={vehicle.odometerReading ? `${vehicle.odometerReading.toLocaleString("en-IN")} KM` : "-"} />
        </dl>
      </DocBox>
    </div>
  );
}

export function NotesAndTerms({
  notes,
  terms,
}: {
  notes: string[];
  terms: string[];
}) {
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <DocBox title="Important Notes" icon={<Award className="h-5 w-5" />}>
        <ul className="list-disc space-y-1 pl-5 text-[12px] leading-5">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </DocBox>
      <DocBox title="Terms & Conditions" icon={<Check className="h-5 w-5" />}>
        <ul className="list-disc space-y-1 pl-5 text-[12px] leading-5">
          {terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
      </DocBox>
    </div>
  );
}

export function SignatureRow({ approvalText = false }: { approvalText?: boolean }) {
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <section className={`rounded-lg border ${maroonBorder} p-4 text-center text-[12px]`}>
        {approvalText ? <p className="mb-3 text-left">I have reviewed the above estimation and approve to proceed.</p> : null}
        <div className="mx-auto mt-5 w-56 border-t border-slate-500 pt-1 font-semibold">Customer Signature</div>
      </section>
      <section className={`rounded-lg border ${maroonBorder} p-4 text-center text-[12px]`}>
        <div className="mx-auto mt-8 w-56 border-t border-slate-500 pt-1 font-semibold">Authorised Signature</div>
      </section>
    </div>
  );
}

export function DocumentFooter({ workshopName }: { workshopName: string }) {
  const highlights = [
    { icon: Award, text: "Quality\nService" },
    { icon: UserCog, text: "Expert\nTechnicians" },
    { icon: Settings, text: "Genuine\nParts" },
    { icon: Check, text: "Customer\nSatisfaction" },
    { icon: Clock, text: "On-time\nDelivery" },
  ];

  return (
    <>
      <footer className={`mt-3 grid items-center gap-3 rounded-lg border ${maroonBorder} p-4 md:grid-cols-[260px_1fr]`}>
        <div className="flex items-center gap-4">
          <Snowflake className={`h-16 w-16 ${maroonText}`} />
          <div>
            <p className={`text-2xl font-black italic ${maroonText}`}>Thank you!</p>
            <p className="text-xs font-semibold">For choosing</p>
            <p className={`text-xs font-black uppercase ${maroonText}`}>{workshopName}</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3 text-center text-[11px] font-semibold">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.text} className="grid justify-items-center gap-1 whitespace-pre-line">
                <Icon className={`h-8 w-8 ${maroonText}`} />
                {item.text}
              </div>
            );
          })}
        </div>
      </footer>
    </>
  );
}
