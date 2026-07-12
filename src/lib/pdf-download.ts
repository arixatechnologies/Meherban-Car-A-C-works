import "server-only";

import fs from "node:fs";
import path from "node:path";

const chromeCandidates = [
  process.env.CHROME_EXECUTABLE_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.platform === "win32" && process.env.PROGRAMFILES
    ? path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe")
    : null,
  process.platform === "win32" && process.env["PROGRAMFILES(X86)"]
    ? path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe")
    : null,
  process.platform === "win32" && process.env.PROGRAMFILES
    ? path.join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe")
    : null,
  process.platform === "win32" && process.env["PROGRAMFILES(X86)"]
    ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe")
    : null,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/opt/google/chrome/chrome",
  "/snap/bin/chromium",
].filter(Boolean) as string[];

function chromeExecutablePath() {
  const executablePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) {
    throw new Error(
      "Chrome/Chromium was not found. Install Chromium on the server or set CHROME_EXECUTABLE_PATH.",
    );
  }

  return executablePath;
}

export function safePdfFilename(value: string) {
  const safeName = value
    .trim()
    .replace(/[^a-z0-9_.-]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return `${safeName || "document"}.pdf`;
}

export async function renderPdfFromUrl(url: string, cookieHeader?: string | null) {
  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: chromeExecutablePath(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }

    await page.setViewport({ width: 1120, height: 1600, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.emulateMediaType("screen");
    await page.addStyleTag({
      content: `
        body,
        main {
          background: #ffffff !important;
          padding: 0 !important;
        }

        .no-print {
          display: none !important;
        }

        .print-page {
          margin: 0 auto !important;
          box-shadow: none !important;
        }
      `,
    });
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      width: "1120px",
      height: "1584px",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      displayHeaderFooter: false,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export function pdfResponse(pdf: Buffer, filename: string) {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safePdfFilename(filename)}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function pdfErrorResponse(error: unknown) {
  console.error("[pdf-download]", error);
  const message =
    error instanceof Error && error.message.includes("Chrome/Chromium")
      ? "PDF download is not configured on this server. Install Chrome/Chromium or set CHROME_EXECUTABLE_PATH."
      : "PDF could not be generated right now. Please try again.";

  return new Response(message, {
    status: 500,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
