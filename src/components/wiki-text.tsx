import Link from "next/link";

/** Renders short text that may contain [[slug]] wikilinks as real links inline. */
export function WikiText({
  text,
  slugToTitle,
}: {
  text: string;
  slugToTitle: Map<string, string>;
}) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[\[([^\]]+)\]\]$/);
        if (!match) return <span key={i}>{part}</span>;
        const slug = match[1].trim();
        const title = slugToTitle.get(slug) ?? slug;
        return (
          <Link key={i} href={`/docs/${slug}`} className="font-semibold text-accent hover:underline">
            {title}
          </Link>
        );
      })}
    </>
  );
}
