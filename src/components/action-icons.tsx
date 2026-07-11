import { Eye, FileDown } from "lucide-react";
import type { SVGProps } from "react";

export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.02 3.2A12.73 12.73 0 0 0 5.24 22.7L3.8 28.8l6.25-1.39A12.75 12.75 0 1 0 16.02 3.2Zm0 2.32a10.43 10.43 0 0 1 8.84 15.98 10.44 10.44 0 0 1-13.96 3.67l-.44-.25-3.58.8.82-3.47-.29-.46A10.42 10.42 0 0 1 16.02 5.52Zm-4.29 5.42c-.22 0-.58.08-.89.43-.31.34-1.17 1.14-1.17 2.78 0 1.65 1.2 3.24 1.37 3.46.17.22 2.31 3.69 5.73 5.02 2.84 1.12 3.42.9 4.04.84.62-.06 2-.82 2.28-1.61.28-.8.28-1.48.2-1.62-.09-.14-.31-.22-.65-.39-.34-.17-2-.98-2.31-1.09-.31-.11-.54-.17-.76.17-.23.34-.87 1.09-1.06 1.31-.2.23-.4.26-.73.09-.34-.17-1.42-.52-2.7-1.66-1-.89-1.67-1.99-1.87-2.33-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.59.17-.2.23-.34.34-.56.11-.23.06-.42-.03-.59-.08-.17-.76-1.83-1.04-2.5-.27-.65-.55-.56-.76-.57h-.65Z" />
    </svg>
  );
}

export function PreviewIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <Eye className={className} />;
}

export function PdfDownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <FileDown className={className} />;
}
