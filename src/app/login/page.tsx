import { redirect } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-[#e7c9c1] bg-[#fffaf5] p-6 shadow-[0_18px_48px_rgba(90,23,59,0.16)]">
        <div className="grid justify-items-center text-center">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-[3px] border-[#5a173b] bg-white p-2">
            <Image src="/logo.png" alt="Meherban Car A/C Works logo" width={96} height={96} className="h-full w-full object-contain" priority />
          </div>
          <h1 className="font-display mt-4 text-3xl font-bold leading-tight text-[#2d1030]">
            Meherban Car A/C Works
          </h1>
          <p className="mt-1 text-sm font-bold text-[#8d6373]">
            Complete Car A/C Service & Repair Specialist
          </p>
        </div>

        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
