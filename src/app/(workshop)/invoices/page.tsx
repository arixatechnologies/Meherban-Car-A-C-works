import { redirect } from "next/navigation";

export default function InvoicesPage() {
  redirect("/?type=invoice");
}
