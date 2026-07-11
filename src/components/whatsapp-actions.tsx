import { CopyButton } from "@/components/copy-button";
import { WhatsAppIcon } from "@/components/action-icons";
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
      <Button
        href={createWhatsAppLink(mobileNumber, message)}
        variant="secondary"
        className="border-[#9bd7ad] bg-[#e8f8ed] text-[#128c3a] hover:bg-[#d8f2df]"
      >
        <WhatsAppIcon className="h-4 w-4" />
        Open WhatsApp
      </Button>
    </div>
  );
}
