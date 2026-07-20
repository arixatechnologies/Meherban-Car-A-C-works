"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { paymentModes } from "@/lib/constants";
import { resolveInspectionItemShortcut } from "@/lib/inspection-shortcuts";
import { label } from "@/lib/utils";

type Decimalish = number | string | { toString(): string } | null | undefined;

type RowCategory = "PARTS" | "LABOUR";

type InitialObservation = {
  id?: string;
  partService: string;
  description: string | null;
  category?: string | null;
  quantity: Decimalish;
  unitPrice: Decimalish;
  amount: Decimalish;
};

type ObservationRow = {
  key: string;
  category: RowCategory;
  partService: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

const inputClass =
  "h-10 w-full rounded-md border-[1.5px] border-[#e3c0c9] bg-white px-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#8b0f2f] focus:ring-4 focus:ring-[#8b0f2f]/10";

function normalizeCategory(category: string | null | undefined): RowCategory {
  return category === "LABOUR" || category === "SERVICE" ? "LABOUR" : "PARTS";
}

const blankRow = (category: RowCategory): ObservationRow => ({
  key: crypto.randomUUID(),
  category,
  partService: "",
  description: "",
  quantity: "",
  unitPrice: "",
  amount: "",
});

function toInputValue(value: Decimalish) {
  if (value == null) return "";
  return value.toString();
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyInput(value: number) {
  return value ? value.toFixed(2) : "";
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function labourUnitPriceValue(row: ObservationRow) {
  return row.amount || row.unitPrice || "";
}

function makeInitialRows(observations: InitialObservation[] | undefined) {
  if (observations?.length) {
    return observations.map((observation) => ({
      key: observation.id ?? crypto.randomUUID(),
      category: normalizeCategory(observation.category),
      partService: observation.partService,
      description: observation.description ?? "",
      quantity: toInputValue(observation.quantity),
      unitPrice: toInputValue(observation.unitPrice),
      amount: toInputValue(observation.amount),
    }));
  }

  return [];
}

export function JobCardPartsEditor({
  observations,
  totalAmount,
  advanceAmount,
  balanceDue,
  paymentMode,
}: {
  observations?: InitialObservation[];
  totalAmount?: Decimalish;
  advanceAmount?: Decimalish;
  balanceDue?: Decimalish;
  paymentMode?: string | null;
}) {
  const [rows, setRows] = useState<ObservationRow[]>(() => makeInitialRows(observations));
  const [advance, setAdvance] = useState(() => toInputValue(advanceAmount));

  const totals = useMemo(
    () =>
      rows.reduce(
        (result, row) => {
          const amount = toNumber(row.amount);
          if (row.category === "PARTS") result.parts += amount;
          if (row.category === "LABOUR") result.labour += amount;
          return result;
        },
        { parts: 0, labour: 0 },
      ),
    [rows],
  );
  const rowsTotal = totals.parts + totals.labour;
  const savedTotal = toInputValue(totalAmount);
  const totalValue = rows.length ? moneyInput(rowsTotal) : savedTotal;
  const balanceValue = useMemo(() => {
    const submittedBalance = toInputValue(balanceDue);
    if (submittedBalance && !rows.length && !totalValue) return submittedBalance;
    return Math.max(toNumber(totalValue) - toNumber(advance), 0).toFixed(2);
  }, [advance, balanceDue, rows.length, totalValue]);
  const returnValue = useMemo(
    () => Math.max(toNumber(advance) - toNumber(totalValue), 0).toFixed(2),
    [advance, totalValue],
  );
  const hasReturnValue = toNumber(returnValue) > 0;
  const settlementLabel = hasReturnValue ? "Return Amount" : "Balance Due";
  const settlementValue = hasReturnValue ? returnValue : balanceValue;

  function updateRow(key: string, field: keyof ObservationRow, value: string) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.key !== key) return row;

        const nextRow = { ...row, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          const amount = toNumber(nextRow.quantity) * toNumber(nextRow.unitPrice);
          nextRow.amount = moneyInput(amount);
        }

        return nextRow;
      }),
    );
  }

  function addRow(category: RowCategory) {
    setRows((currentRows) => [...currentRows, blankRow(category)]);
  }

  function removeRow(key: string) {
    setRows((currentRows) => currentRows.filter((row) => row.key !== key));
  }

  function observationSection(category: RowCategory, title: string, emptyText: string) {
    const sectionRows = rows.filter((row) => row.category === category);
    const sectionTotal = category === "PARTS" ? totals.parts : totals.labour;
    const isLabour = category === "LABOUR";
    const emptyColSpan = isLabour ? 5 : 7;
    const totalColSpan = isLabour ? 3 : 5;

    return (
      <section className="overflow-hidden rounded-lg border-[1.5px] border-[#d9a5b3] bg-white">
        <div className="inline-flex min-h-10 items-center rounded-br-md bg-[#8b0f2f] px-4 text-sm font-black uppercase tracking-wide text-white">
          {title}
        </div>
        <div className="overflow-x-auto p-4">
          <table className={`w-full ${isLabour ? "min-w-[700px]" : "min-w-[920px]"} border-collapse text-sm`}>
            <thead>
              <tr className="bg-[#fff3f6] text-[#650820]">
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Sr. No.</th>
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Part / Service</th>
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Description</th>
                {!isLabour ? (
                  <>
                    <th className="border border-[#ead0d7] px-2 py-2 uppercase">Qty.</th>
                    <th className="border border-[#ead0d7] px-2 py-2 uppercase">Unit Price {"\u20B9"}</th>
                  </>
                ) : null}
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Amount {"\u20B9"}</th>
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {sectionRows.length === 0 ? (
                <tr>
                  <td className="border border-[#ead0d7] px-3 py-5 text-center text-sm font-semibold text-slate-500" colSpan={emptyColSpan}>
                    {emptyText}
                  </td>
                </tr>
              ) : null}
              {sectionRows.map((row, index) => (
                <tr key={row.key}>
                  <td className="border border-[#ead0d7] px-2 py-2 text-center font-semibold">{index + 1}</td>
                  <td className="border border-[#ead0d7] px-2 py-2">
                    <input type="hidden" name="observationCategory" value={row.category} />
                    {isLabour ? (
                      <>
                        <input type="hidden" name="observationQuantity" value="1" readOnly />
                        <input type="hidden" name="observationUnitPrice" value={labourUnitPriceValue(row)} readOnly />
                      </>
                    ) : null}
                    <input
                      name="observationPartService"
                      value={row.partService}
                      onChange={(event) => updateRow(row.key, "partService", event.target.value)}
                      onBlur={(event) => updateRow(row.key, "partService", resolveInspectionItemShortcut(event.target.value))}
                      className={inputClass}
                    />
                  </td>
                  <td className="border border-[#ead0d7] px-2 py-2">
                    <input
                      name="observationDescription"
                      value={row.description}
                      onChange={(event) => updateRow(row.key, "description", event.target.value)}
                      className={inputClass}
                    />
                  </td>
                  {!isLabour ? (
                    <>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="observationQuantity"
                          type="text"
                          inputMode="decimal"
                          value={row.quantity}
                          onChange={(event) => updateRow(row.key, "quantity", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="observationUnitPrice"
                          type="text"
                          inputMode="decimal"
                          value={row.unitPrice}
                          onChange={(event) => updateRow(row.key, "unitPrice", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                    </>
                  ) : null}
                  <td className="border border-[#ead0d7] px-2 py-2">
                    <input
                      name="observationAmount"
                      type="text"
                      inputMode="decimal"
                      value={row.amount}
                      onChange={(event) => updateRow(row.key, "amount", event.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="border border-[#ead0d7] px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ffe5ec] text-[#650820] transition hover:bg-[#8b0f2f] hover:text-white"
                      title="Remove row"
                      aria-label={`Remove ${title} row`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#fff3f6] font-black text-[#650820]">
                <td className="border border-[#ead0d7] px-3 py-2 text-right uppercase" colSpan={totalColSpan}>
                  Total {"\u20B9"}
                </td>
                <td className="border border-[#ead0d7] px-2 py-2 text-right tabular-nums">{money(sectionTotal)}</td>
                <td className="border border-[#ead0d7]" />
              </tr>
            </tfoot>
          </table>

          <div className="mt-3 flex justify-start">
            <button
              type="button"
              onClick={() => addRow(category)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#8b0f2f] px-4 text-sm font-black text-white transition hover:bg-[#650820]"
            >
              <Plus className="h-4 w-4" />
              Add {category === "PARTS" ? "Part / Material" : "Labour / Service"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mt-4 overflow-hidden rounded-lg border-[1.5px] border-[#d9a5b3] bg-white">
        <div className="inline-flex min-h-10 items-center rounded-br-md bg-[#8b0f2f] px-4 text-sm font-black uppercase tracking-wide text-white">
          Spare Parts / Service Observation
        </div>

        <div className="grid gap-4 p-4">
          {observationSection("PARTS", "Parts / Materials", "Click Add Part / Material to enter items.")}
          {observationSection("LABOUR", "Labour / Services", "Click Add Labour / Service to enter items.")}
          <div className="ml-auto grid w-full max-w-sm gap-2 rounded-lg border-[1.5px] border-[#d9a5b3] bg-[#fff3f6] p-4 text-sm font-bold text-[#650820]">
            <div className="flex justify-between gap-4">
              <span>Parts Total</span>
              <strong className="whitespace-nowrap tabular-nums">{money(totals.parts)}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Labour Total</span>
              <strong className="whitespace-nowrap tabular-nums">{money(totals.labour)}</strong>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#d9a5b3] pt-2 text-base">
              <span>Grand Total</span>
              <strong className="whitespace-nowrap tabular-nums">{money(rowsTotal)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-lg border-[1.5px] border-[#d9a5b3] bg-white">
        <div className="inline-flex min-h-10 items-center rounded-br-md bg-[#8b0f2f] px-4 text-sm font-black uppercase tracking-wide text-white">
          Payment Details
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-4">
          <label className="grid gap-2 text-sm font-bold text-slate-950">
            <span>Total Amount {"\u20B9"}</span>
            <input
              name="estimatedTotalAmount"
              type="text"
              inputMode="decimal"
              readOnly
              value={totalValue}
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-950">
            <span>Payment Mode</span>
            <select name="jobCardPaymentMode" defaultValue={paymentMode ?? ""} className={inputClass}>
              <option value="">Select payment mode</option>
              {paymentModes.map((mode) => (
                <option key={mode} value={mode}>
                  {label(mode)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-950">
            <span>Advance {"\u20B9"}</span>
            <input
              name="advanceAmount"
              type="text"
              inputMode="decimal"
              value={advance}
              onChange={(event) => setAdvance(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-950">
            <span>{settlementLabel} {"\u20B9"}</span>
            <input name="balanceDue" type="text" readOnly value={settlementValue} className={inputClass} />
          </label>
        </div>
      </section>
    </>
  );
}
