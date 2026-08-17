import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { db } from "@/lib/db";
import { IconTile } from "@/components/icon-tile";
import { AgentChat } from "@/components/agents/agent-chat";
import { DEPARTMENT_LABELS } from "@/lib/brain";
import { DEPARTMENT_GRADIENTS, DEPARTMENT_ICONS } from "@/lib/department-style";
import { NEUTRAL_GRADIENT } from "@/lib/project-style";

export const dynamic = "force-dynamic";

export default async function AgentChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await db.brainFile.findFirst({ where: { slug, type: "agent" } });
  if (!agent || agent.status !== "active") notFound();

  const gradient = agent.department ? DEPARTMENT_GRADIENTS[agent.department] ?? NEUTRAL_GRADIENT : NEUTRAL_GRADIENT;
  const Icon = agent.department ? DEPARTMENT_ICONS[agent.department] ?? Building2 : Building2;

  return (
    <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-3xl flex-col">
      <Link href="/agents" className="mb-3 inline-block text-[0.8rem] text-text-dim hover:text-accent">
        ← Agents
      </Link>
      <div className="mb-4 flex items-center gap-2.5">
        <IconTile icon={Icon} gradient={gradient} size="sm" />
        <div>
          <h1 className="text-[1.1rem] font-extrabold tracking-tight">{agent.title}</h1>
          {agent.department && (
            <p className="text-[0.72rem] text-text-faint">
              {DEPARTMENT_LABELS[agent.department] ?? agent.department} · grounded in the
              department&apos;s docs
            </p>
          )}
        </div>
      </div>
      <AgentChat agentSlug={agent.slug} agentTitle={agent.title} />
    </div>
  );
}
