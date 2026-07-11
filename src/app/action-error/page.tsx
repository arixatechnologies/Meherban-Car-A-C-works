import Link from "next/link";

export const dynamic = "force-dynamic";

function safeReturnTo(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function ActionErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const message = (params.message || "Something went wrong. Please try again.").slice(0, 220);
  const returnTo = safeReturnTo(params.returnTo);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4">
      <section className="w-full max-w-lg rounded-lg border border-[#e7c9c1] bg-[#fffaf5] p-6 text-center shadow-[0_16px_45px_rgba(90,23,59,0.12)]">
        <p className="text-xs font-black uppercase tracking-wide text-[#b75561]">Action Failed</p>
        <h1 className="font-display mt-2 text-3xl font-bold text-[#2d1030]">Could not complete this action</h1>
        <p className="mt-3 rounded-lg bg-[#fde2e2] px-3 py-2 text-sm font-bold text-[#9d2f47]">{message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href={returnTo}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#5a173b] px-4 text-sm font-bold text-white transition hover:bg-[#42102e]"
          >
            Go Back
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e7c9c1] bg-[#fff8f2] px-4 text-sm font-bold text-[#4b1737] transition hover:bg-[#f4ded6]"
          >
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
