"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fbf1e8", color: "#2f1233", fontFamily: "Arial, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
          <section
            style={{
              maxWidth: 520,
              border: "1px solid #e7c9c1",
              borderRadius: 8,
              background: "#fffaf5",
              padding: 24,
              textAlign: "center",
              boxShadow: "0 16px 45px rgba(90,23,59,0.12)",
            }}
          >
            <p style={{ margin: 0, color: "#b75561", fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}>
              Error
            </p>
            <h1 style={{ margin: "8px 0 0", color: "#2d1030", fontSize: 30 }}>Application error</h1>
            <p style={{ color: "#6f475c", fontWeight: 600 }}>
              The app could not load. Please try again. If it repeats, check the server logs.
            </p>
            {error.digest ? (
              <p style={{ background: "#fde2e2", color: "#9d2f47", padding: 10, borderRadius: 8, fontWeight: 700 }}>
                Error ID: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                height: 40,
                border: 0,
                borderRadius: 8,
                background: "#5a173b",
                color: "#fff",
                padding: "0 16px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
