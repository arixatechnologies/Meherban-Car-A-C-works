import { redirect } from "next/navigation";

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const source = await searchParams;
  const params = new URLSearchParams({ type: "estimate" });
  if (source.q) params.set("q", source.q);
  if (source.page) params.set("page", source.page);
  redirect(`/?${params.toString()}`);
}
