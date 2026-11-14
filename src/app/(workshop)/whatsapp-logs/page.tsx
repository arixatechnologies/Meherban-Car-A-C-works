import { redirect } from "next/navigation";

export default async function WhatsAppLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const source = await searchParams;
  const params = new URLSearchParams();
  if (source.q) params.set("q", source.q);
  if (source.page) params.set("page", source.page);
  const query = params.toString();
  redirect(query ? `/settings/whatsapp-logs?${query}` : "/settings/whatsapp-logs");
}
