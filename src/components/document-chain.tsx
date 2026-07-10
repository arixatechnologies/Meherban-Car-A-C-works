import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ChainItem = {
  label: string;
  href?: string | null;
  number?: string | null;
};

export function DocumentChain({ items }: { items: ChainItem[] }) {
  return (
    <section className="no-print mx-auto grid w-full max-w-[1120px] gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Document Chain</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => {
          const complete = Boolean(item.href);
          const content = (
            <span
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2 text-left",
                complete
                  ? "border-cyan-200 bg-cyan-50 text-slate-950"
                  : "border-slate-200 bg-slate-50 text-slate-400",
              )}
            >
              {complete ? <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-700" /> : <Circle className="h-5 w-5 shrink-0" />}
              <span>
                <span className="block text-sm font-black">{item.label}</span>
                <span className="mt-0.5 block text-xs font-semibold">{item.number || "Not created"}</span>
              </span>
            </span>
          );

          return item.href ? (
            <Link key={item.label} href={item.href}>
              {content}
            </Link>
          ) : (
            <div key={item.label}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}
