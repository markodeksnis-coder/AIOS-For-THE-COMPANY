import { Card } from "@/components/ui/card";

type Status = "connected" | "configured_no_data" | "not_connected";

function statusOf(envConfigured: boolean, hasData: boolean): Status {
  if (!envConfigured) return "not_connected";
  if (!hasData) return "configured_no_data";
  return "connected";
}

const STATUS_STYLE: Record<Status, { dot: string; label: string }> = {
  connected: { dot: "bg-good", label: "Connected" },
  configured_no_data: { dot: "bg-warn", label: "Configured — no data received yet" },
  not_connected: { dot: "bg-critical", label: "Not connected" },
};

export function IntegrationStatus({
  fathomConfigured,
  fathomCallCount,
  calendlyConfigured,
  calendlyLeadCount,
  setupDocsBaseUrl,
}: {
  fathomConfigured: boolean;
  fathomCallCount: number;
  calendlyConfigured: boolean;
  calendlyLeadCount: number;
  setupDocsBaseUrl: string;
}) {
  const fathomStatus = statusOf(fathomConfigured, fathomCallCount > 0);
  const calendlyStatus = statusOf(calendlyConfigured, calendlyLeadCount > 0);

  if (fathomStatus === "connected" && calendlyStatus === "connected") return null;

  return (
    <Card className="mb-6 p-4">
      <h2 className="mb-3 text-[0.8rem] font-bold">Integration status</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Row
          name="Fathom"
          status={fathomStatus}
          detail={
            fathomStatus === "connected"
              ? `${fathomCallCount} call${fathomCallCount === 1 ? "" : "s"} auto-attached so far`
              : fathomStatus === "configured_no_data"
                ? "Signing key is set, but no recording has landed yet — record a call and check back"
                : "One-time setup needed — run the webhook registration from your own terminal"
          }
          docHref={`${setupDocsBaseUrl}/docs/fathom-setup.md`}
        />
        <Row
          name="Calendly"
          status={calendlyStatus}
          detail={
            calendlyStatus === "connected"
              ? `${calendlyLeadCount} lead${calendlyLeadCount === 1 ? "" : "s"} auto-created from bookings so far`
              : calendlyStatus === "configured_no_data"
                ? "Signing key is set, but no booking has landed yet — book a test call and check back"
                : "One-time setup needed — run the webhook registration from your own terminal"
          }
          docHref={`${setupDocsBaseUrl}/docs/calendly-setup.md`}
        />
      </div>
    </Card>
  );
}

function Row({
  name,
  status,
  detail,
  docHref,
}: {
  name: string;
  status: Status;
  detail: string;
  docHref: string;
}) {
  const style = STATUS_STYLE[status];
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border p-3">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[0.83rem] font-bold">{name}</span>
          <span className="text-[0.7rem] text-text-faint">{style.label}</span>
        </div>
        <p className="mt-0.5 text-[0.76rem] text-text-dim">{detail}</p>
        {status !== "connected" && (
          <a
            href={docHref}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-[0.76rem] font-semibold text-accent-strong hover:underline"
          >
            Setup steps →
          </a>
        )}
      </div>
    </div>
  );
}
