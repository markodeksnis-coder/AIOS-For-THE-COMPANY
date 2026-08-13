import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

export function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="max-w-[68ch] text-[0.9rem] leading-[1.65] text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mb-3 mt-6 text-xl font-extrabold first:mt-0" {...p} />,
          h2: (p) => <h2 className="mb-2 mt-5 text-lg font-bold" {...p} />,
          h3: (p) => <h3 className="mb-2 mt-4 text-base font-bold" {...p} />,
          p: (p) => <p className="mb-3 text-text-dim" {...p} />,
          ul: (p) => <ul className="mb-3 list-disc space-y-1 pl-5 text-text-dim" {...p} />,
          ol: (p) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-text-dim" {...p} />,
          li: (p) => <li {...p} />,
          strong: (p) => <strong className="font-bold text-foreground" {...p} />,
          code: (p) => (
            <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.8em]" {...p} />
          ),
          blockquote: (p) => (
            <blockquote
              className="mb-3 border-l-2 border-accent bg-accent-wash px-3 py-2 text-text-dim"
              {...p}
            />
          ),
          a: ({ href, children }) => {
            const isInternal = href?.startsWith("/");
            if (isInternal && href) {
              return (
                <Link href={href} className="font-semibold text-accent hover:underline">
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
