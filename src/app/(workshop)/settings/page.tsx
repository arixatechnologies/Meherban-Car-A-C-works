import { SettingsForm } from "@/components/forms";
import { Button, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SettingsPage() {
  const setting =
    (await prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } })) ??
    (await prisma.workshopSetting.create({ data: {} }));

  return (
    <div className="grid gap-6">
      <PageHeader title="Settings" action={<Button href="/settings/whatsapp-logs" variant="secondary">WhatsApp Logs</Button>} />
      <Card>
        <CardHeader title="Workshop & WhatsApp Settings" />
        <CardBody>
          <SettingsForm setting={setting} />
        </CardBody>
      </Card>
    </div>
  );
}
