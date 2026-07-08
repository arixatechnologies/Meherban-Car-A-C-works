import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex min-h-[44vh] flex-col justify-between bg-[linear-gradient(140deg,#061826,#0f766e)] p-8 text-white lg:min-h-screen lg:p-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-100">Meherban Car A/C Works</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight lg:text-6xl">
            Digital Job Card & Service Management System
          </h1>
        </div>
        <div className="grid gap-4 text-sm text-cyan-50 sm:grid-cols-3">
          <div className="rounded-lg border border-white/15 bg-white/10 p-4">
            <p className="font-semibold">Workshop Flow</p>
            <p className="mt-1 text-cyan-100">Job cards, diagnosis, estimates, bills, and delivery.</p>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-4">
            <p className="font-semibold">Customer Updates</p>
            <p className="mt-1 text-cyan-100">WhatsApp-ready tracking with manual fallback.</p>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-4">
            <p className="font-semibold">PostgreSQL</p>
            <p className="mt-1 text-cyan-100">Prisma-backed records for complete service history.</p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Secure login</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Workshop login</h2>
          <p className="mt-1 text-sm text-slate-600">Default admin login is prefilled for the seeded demo.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
