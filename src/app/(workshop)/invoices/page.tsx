import { redirect } from "next/navigation";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const source = await searchParams;
  const params = new URLSearchParams({ type: "invoice" });
  if (source.q) params.set("q", source.q);
  if (source.page) params.set("page", source.page);
  redirect(`/?${params.toString()}`);
}
