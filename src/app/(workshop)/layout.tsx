import {
  BarChart3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { logoutAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/job-cards", label: "Job Cards", icon: ClipboardList },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function WorkshopLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen bg-[var(--background)] print:bg-white">
      <header className="sticky top-0 z-20 border-b border-[#e7c9c1] bg-[#fffaf5]/95 shadow-[0_8px_24px_rgba(90,23,59,0.08)] backdrop-blur print:hidden">
        <div className="flex flex-col gap-3 px-4 py-4 xl:flex-row xl:items-center xl:justify-between xl:px-8">
          <div className="flex min-w-64 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#5a173b] bg-white p-1">
              <Image src="/logo.png" alt="Meharban Car A/C Works logo" width={42} height={42} className="h-full w-full object-contain" priority />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-[#2d1030]">Meharban Car A/C Works</p>
              <p className="text-xs font-bold uppercase tracking-wide text-[#a55667]">Service Management</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button href="/job-cards/new">
              <Plus className="h-4 w-4" />
              Create Job Card
            </Button>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2d1030] px-4 text-sm font-bold text-white transition hover:bg-[#5a173b]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto border-t border-[#f0ded8] px-4 py-2 xl:px-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#f6e2d6] px-3 text-sm font-bold text-[#4b1737] transition hover:bg-[#5a173b] hover:text-white"
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
