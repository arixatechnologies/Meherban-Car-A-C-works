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
    <section className={cn("rounded-lg border border-[#e7c9c1] bg-[#fffaf5] shadow-[0_10px_28px_rgba(90,23,59,0.08)]", className)}>
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
    <div className="flex flex-col gap-3 border-b border-[#efd9d3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-wide text-[#b75561]">{eyebrow}</p> : null}
        <h2 className="font-display text-xl font-bold text-[#2d1030]">{title}</h2>
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
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#d97873] focus:ring-offset-2",
    variant === "primary" && "bg-[#5a173b] text-white hover:bg-[#42102e]",
    variant === "secondary" && "border border-[#e7c9c1] bg-[#fff8f2] text-[#4b1737] hover:bg-[#f4ded6]",
    variant === "danger" && "bg-[#b63a58] text-white hover:bg-[#922642]",
    variant === "ghost" && "text-[#4b1737] hover:bg-[#f4ded6]",
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
        "inline-flex min-h-7 items-center rounded-full px-3 text-xs font-bold",
        tone === "success" && "bg-[#e9ecd9] text-[#4e5d33] ring-1 ring-[#c9d0b1]",
        tone === "warning" && "bg-[#fff0cd] text-[#8a5711] ring-1 ring-[#f0cf8f]",
        tone === "danger" && "bg-[#fde2e2] text-[#9d2f47] ring-1 ring-[#efb6bd]",
        tone === "neutral" && "bg-[#eadce9] text-[#5a173b] ring-1 ring-[#cfb3d1]",
      )}
    >
      {label(value)}
    </span>
  );
}

export function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#d7a9ad] bg-[#fff3ec] px-5 py-8 text-center text-sm font-semibold text-[#6a3b50]">
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
    <label className={cn("grid gap-2 text-sm font-bold text-[#4b1737]", className)}>
      <span>{labelText}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 rounded-lg border border-[#e2beb8] bg-[#fffaf7] px-3 text-sm font-semibold text-[#2f1233] outline-none transition placeholder:text-[#a88996] focus:border-[#d97873] focus:ring-2 focus:ring-[#f8cdbf]";

export const textareaClass =
  "min-h-24 rounded-lg border border-[#e2beb8] bg-[#fffaf7] px-3 py-2 text-sm font-semibold text-[#2f1233] outline-none transition placeholder:text-[#a88996] focus:border-[#d97873] focus:ring-2 focus:ring-[#f8cdbf]";

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
        <h1 className="font-display text-3xl font-bold text-[#2d1030]">{title}</h1>
        {description ? <p className="mt-1 text-sm font-semibold text-[#6f475c]">{description}</p> : null}
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
      <table className="min-w-full divide-y divide-[#edd7d0] text-sm">
        <thead className="bg-[#f8e7df]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3 text-left font-bold text-[#5a173b]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1ddd6] bg-[#fffaf5]">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-[#fff1e8]">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-4 py-3 font-semibold text-[#4c2a43]">
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
    <div className="rounded-lg border border-[#e7c9c1] bg-[#fffaf5] p-4 shadow-[0_10px_24px_rgba(90,23,59,0.07)]">
      <p className="text-xs font-bold uppercase tracking-wide text-[#a55667]">{label}</p>
      <p className="font-display mt-2 text-3xl font-bold text-[#2d1030]">{value}</p>
    </div>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}

export function DetailItem({ labelText, value }: { labelText: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-[#fff1e8] p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-[#a55667]">{labelText}</dt>
      <dd className="mt-1 text-sm font-bold text-[#2f1233]">{value || "-"}</dd>
    </div>
  );
}
