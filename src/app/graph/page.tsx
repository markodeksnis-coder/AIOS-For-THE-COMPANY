import { db } from "@/lib/db";
import { parseLinks } from "@/lib/brain";
import { GraphView } from "@/components/graph/graph-view";

export default async function GraphPage() {
  const files = await db.brainFile.findMany();

  const graphInput = files.map((f) => ({
    slug: f.slug,
    title: f.title,
    type: f.type,
    links: parseLinks(f),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          The Brain · Graph
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Graph</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">
          Every file in <code className="text-text-faint">/brain</code>, and every [[wikilink]]
          between them, laid out as a map. Bigger dots have more connections.
        </p>
      </div>
      <GraphView files={graphInput} />
    </div>
  );
}
