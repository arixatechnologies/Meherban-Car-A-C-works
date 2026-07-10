"use client";

import { useMemo, useState } from "react";
import { paymentModes } from "@/lib/constants";
import { label } from "@/lib/utils";

type Decimalish = number | string | { toString(): string } | null | undefined;

type InitialObservation = {
  id?: string;
  partService: string;
  description: string | null;
  quantity: Decimalish;
  unitPrice: Decimalish;
  amount: Decimalish;
};

type ObservationRow = {
  key: string;
  partService: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

const inputClass =
  "h-10 w-full rounded-md border-[1.5px] border-[#e3c0c9] bg-white px-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#8b0f2f] focus:ring-4 focus:ring-[#8b0f2f]/10";

const blankRow = (): ObservationRow => ({
  key: crypto.randomUUID(),
  partService: "",
  description: "",
  quantity: "",
  unitPrice: "",
  amount: "",
});

const placeholderRows = [
  {
    partService: "Cabin Air Filter",
    description: "High Quality",
    quantity: "1",
    unitPrice: "350",
    amount: "350",
  },
  {
    partService: "A/C Gas (R134a)",
    description: "Refrigerant Gas",
    quantity: "450 g",
    unitPrice: "900",
    amount: "900",
  },
  {
    partService: "Cooling Coil Cleaning",
    description: "A/C Evaporator Cleaning",
    quantity: "1",
    unitPrice: "600",
    amount: "600",
  },
  {
    partService: "General Check & Labour",
    description: "Labour Charge",
    quantity: "1",
    unitPrice: "500",
    amount: "500",
  },
];

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

function makeInitialRows(observations: InitialObservation[] | undefined) {
  if (observations?.length) {
    return observations.map((observation) => ({
      key: observation.id ?? crypto.randomUUID(),
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

  const rowsTotal = useMemo(
    () => rows.reduce((sum, row) => sum + toNumber(row.amount), 0),
    [rows],
  );
  const savedTotal = toInputValue(totalAmount);
  const totalValue = rows.length ? moneyInput(rowsTotal) : savedTotal;
  const balanceValue = useMemo(() => {
    const submittedBalance = toInputValue(balanceDue);
    if (submittedBalance && !rows.length && !totalValue) return submittedBalance;
    return Math.max(toNumber(totalValue) - toNumber(advance), 0).toFixed(2);
  }, [advance, balanceDue, rows.length, totalValue]);

  function updateRow(index: number, field: keyof ObservationRow, value: string) {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const nextRow = { ...row, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          const amount = toNumber(nextRow.quantity) * toNumber(nextRow.unitPrice);
          nextRow.amount = moneyInput(amount);
        }

        return nextRow;
      }),
    );
  }

  function addRow() {
    setRows((currentRows) => [...currentRows, blankRow()]);
  }

  function removeRow(index: number) {
    setRows((currentRows) => currentRows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <>
      <section className="mt-4 overflow-hidden rounded-lg border-[1.5px] border-[#d9a5b3] bg-white">
        <div className="inline-flex min-h-10 items-center rounded-br-md bg-[#8b0f2f] px-4 text-sm font-black uppercase tracking-wide text-white">
          Spare Parts / Service Observation
        </div>

        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#fff3f6] text-[#650820]">
                  <th className="border border-[#ead0d7] px-2 py-2 uppercase">Sr. No.</th>
                  <th className="border border-[#ead0d7] px-2 py-2 uppercase">Part / Service</th>
                  <th className="border border-[#ead0d7] px-2 py-2 uppercase">Description</th>
                  <th className="border border-[#ead0d7] px-2 py-2 uppercase">Qty.</th>
                  <th className="border border-[#ead0d7] px-2 py-2 uppercase">Unit Price {"\u20B9"}</th>
                  <th className="border border-[#ead0d7] px-2 py-2 uppercase">Amount {"\u20B9"}</th>
                  <th className="border border-[#ead0d7] px-2 py-2 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="border border-[#ead0d7] px-3 py-5 text-center text-sm font-semibold text-slate-500" colSpan={7}>
                      Click + Add Part / Service to enter items.
                    </td>
                  </tr>
                ) : null}
                {rows.map((row, index) => {
                  const placeholders = placeholderRows[index] ?? {
                    partService: "Enter part / service",
                    description: "Enter description",
                    quantity: "Qty",
                    unitPrice: "Unit price",
                    amount: "Amount",
                  };

                  return (
                    <tr key={row.key}>
                      <td className="border border-[#ead0d7] px-2 py-2 text-center font-semibold">{index + 1}</td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="observationPartService"
                          value={row.partService}
                          placeholder={placeholders.partService}
                          onChange={(event) => updateRow(index, "partService", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="observationDescription"
                          value={row.description}
                          placeholder={placeholders.description}
                          onChange={(event) => updateRow(index, "description", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="observationQuantity"
                          type="text"
                          inputMode="decimal"
                          value={row.quantity}
                          placeholder={placeholders.quantity}
                          onChange={(event) => updateRow(index, "quantity", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="observationUnitPrice"
                          type="number"
                          step="0.01"
                          value={row.unitPrice}
                          placeholder={placeholders.unitPrice}
                          onChange={(event) => updateRow(index, "unitPrice", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="observationAmount"
                          type="number"
                          step="0.01"
                          value={row.amount}
                          placeholder={placeholders.amount}
                          onChange={(event) => updateRow(index, "amount", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-[#ead0d7] px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ffe5ec] text-xl font-black leading-none text-[#650820] transition hover:bg-[#8b0f2f] hover:text-white"
                          title="Remove row"
                          aria-label="Remove row"
                        >
                          {"\u00d7"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#fff3f6] font-black text-[#650820]">
                  <td className="border border-[#ead0d7] px-3 py-2 text-right uppercase" colSpan={5}>
                    Total {"\u20B9"}
                  </td>
                  <td className="border border-[#ead0d7] px-2 py-2">
                    <input readOnly value={moneyInput(rowsTotal)} className={inputClass} />
                  </td>
                  <td className="border border-[#ead0d7]" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-3 flex justify-start">
            <button
              type="button"
              onClick={addRow}
              className="rounded-md bg-[#8b0f2f] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#650820]"
            >
              + Add Part / Service
            </button>
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
              type="number"
              step="0.01"
              readOnly
              value={totalValue}
              placeholder="2350"
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-950">
            <span>Payment Mode</span>
            <select name="jobCardPaymentMode" defaultValue={paymentMode ?? ""} className={inputClass}>
              <option value="">Select payment mode</option>
              {paymentModes.filter((mode) => mode !== "CREDIT_PAY_LATER").map((mode) => (
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
              type="number"
              step="0.01"
              value={advance}
              placeholder="1000"
              onChange={(event) => setAdvance(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-950">
            <span>Balance Due {"\u20B9"}</span>
            <input name="balanceDue" type="number" step="0.01" readOnly value={balanceValue} placeholder="1350" className={inputClass} />
          </label>
        </div>
      </section>
    </>
  );
}
