import { db } from "@/lib/db";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const departments = await db.brainFile.findMany({ where: { type: "department" } });
  const rows = departments.map((d) => ({ slug: d.slug, department: d.department ?? "" }));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Settings
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Display preferences</h1>
        <p className="mt-1 max-w-[56ch] text-[0.88rem] text-text-dim">
          These are saved in this browser only — there&apos;s no login yet, so they&apos;re not
          shared across devices.
        </p>
      </div>
      <SettingsForm departments={rows} />
    </div>
  );
}
