import { SettingsForm } from "@/components/forms";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SettingsPage() {
  const setting =
    (await prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } })) ??
    (await prisma.workshopSetting.create({ data: {} }));

  return (
    <div className="grid gap-6">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader title="Workshop & WhatsApp Settings" />
        <CardBody>
          <SettingsForm setting={setting} />
        </CardBody>
      </Card>
    </div>
  );
}
