import Link from "next/link";
import type { ReactNode } from "react";
import { cn, label, statusTone } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</p> : null}
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  className,
}: {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  className?: string;
}) {
  const classes = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
    variant === "primary" && "bg-teal-600 text-white hover:bg-teal-700",
    variant === "secondary" && "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
    variant === "ghost" && "text-slate-700 hover:bg-slate-100",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes}>
      {children}
    </button>
  );
}

export function Badge({ value }: { value: string }) {
  const tone = statusTone(value);
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold",
        tone === "success" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        tone === "warning" && "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        tone === "danger" && "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
        tone === "neutral" && "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
      )}
    >
      {label(value)}
    </span>
  );
}

export function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">
      {title}
    </div>
  );
}

export function Field({
  labelText,
  children,
  className,
}: {
  labelText: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-2 text-sm font-medium text-slate-700", className)}>
      <span>{labelText}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export const textareaClass =
  "min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SearchBar({
  action,
  placeholder = "Search",
  defaultValue,
  children,
}: {
  action?: string;
  placeholder?: string;
  defaultValue?: string;
  children?: ReactNode;
}) {
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn(inputClass, "sm:w-80")}
      />
      {children}
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}

export function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={empty} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-slate-50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}

export function DetailItem({ labelText, value }: { labelText: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{labelText}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value || "-"}</dd>
    </div>
  );
}
