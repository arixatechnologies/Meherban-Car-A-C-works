import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui";
import { createWhatsAppLink } from "@/lib/whatsapp";

export function WhatsAppActions({
  mobileNumber,
  message,
}: {
  mobileNumber: string;
  message: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton text={message} />
      <Button href={createWhatsAppLink(mobileNumber, message)} variant="secondary">
        Open WhatsApp
      </Button>
    </div>
  );
}
