"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4">
      <section className="w-full max-w-lg rounded-lg border border-[#e7c9c1] bg-[#fffaf5] p-6 text-center shadow-[0_16px_45px_rgba(90,23,59,0.12)]">
        <p className="text-xs font-black uppercase tracking-wide text-[#b75561]">Error</p>
        <h1 className="font-display mt-2 text-3xl font-bold text-[#2d1030]">Something went wrong</h1>
        <p className="mt-3 text-sm font-semibold text-[#6f475c]">
          The page could not load properly. Please try again. If it repeats, check the server logs.
        </p>
        {error.digest ? (
          <p className="mt-3 rounded-lg bg-[#fde2e2] px-3 py-2 text-xs font-bold text-[#9d2f47]">
            Error ID: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#5a173b] px-4 text-sm font-bold text-white transition hover:bg-[#42102e]"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e7c9c1] bg-[#fff8f2] px-4 text-sm font-bold text-[#4b1737] transition hover:bg-[#f4ded6]"
          >
            Go Home
          </Link>
        </div>
      </section>
    </main>
  );
}
