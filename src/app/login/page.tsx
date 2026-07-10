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
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-[#d9a5b3] bg-white p-6 shadow-xl">
        <div className="grid justify-items-center text-center">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-[3px] border-[#8b0f2f] bg-white p-2">
            <Image src="/logo.png" alt="Meherban Car A/C Works logo" width={96} height={96} className="h-full w-full object-contain" priority />
          </div>
          <h1 className="mt-4 text-2xl font-black uppercase leading-tight text-[#650820]">
            Meherban Car A/C Works
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
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
