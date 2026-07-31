import type { Metadata } from "next";
import { Geist_Mono, Lora, Noto_Sans, Nunito_Sans } from "next/font/google";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const notoSans = Noto_Sans({
  variable: "--font-document",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meharban Car A/C Works",
  description: "Digital job card and service management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunitoSans.variable} ${lora.variable} ${notoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
