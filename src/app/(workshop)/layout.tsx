import {
  BarChart3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { logoutAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/job-cards", label: "Job Cards", icon: ClipboardList },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/whatsapp-logs", label: "WhatsApp Logs", icon: MessageCircle },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function WorkshopLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="flex flex-col gap-3 px-4 py-4 xl:flex-row xl:items-center xl:justify-between xl:px-8">
          <div className="min-w-64">
            <p className="text-lg font-bold text-slate-950">Meherban Car A/C Works</p>
            <p className="text-xs text-slate-500">Service Management</p>
          </div>
          <form action="/search" className="relative w-full xl:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              placeholder="Search customer, mobile, vehicle, job card"
              className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <Button href="/job-cards/new">
              <Plus className="h-4 w-4" />
              Create Job Card
            </Button>
            <details className="relative">
              <summary className="flex h-11 cursor-pointer list-none items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-50 text-xs text-teal-700">
                  {initials(user.name)}
                </span>
                {user.name}
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                <p className="text-sm font-semibold text-slate-950">{user.email}</p>
                <p className="text-xs text-slate-500">{user.role.replaceAll("_", " ")}</p>
                <form action={logoutAction} className="mt-3">
                  <button
                    type="submit"
                    className="h-10 w-full rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 xl:px-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-950 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="px-4 py-6 print:p-0 lg:px-8">{children}</main>
    </div>
  );
}
