import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4">
      <section className="w-full max-w-lg rounded-lg border border-[#e7c9c1] bg-[#fffaf5] p-6 text-center shadow-[0_16px_45px_rgba(90,23,59,0.12)]">
        <p className="text-xs font-black uppercase tracking-wide text-[#b75561]">404</p>
        <h1 className="font-display mt-2 text-3xl font-bold text-[#2d1030]">Page not found</h1>
        <p className="mt-3 text-sm font-semibold text-[#6f475c]">
          The record or page you are looking for is not available.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-[#5a173b] px-4 text-sm font-bold text-white transition hover:bg-[#42102e]"
        >
          Go Home
        </Link>
      </section>
    </main>
  );
}
