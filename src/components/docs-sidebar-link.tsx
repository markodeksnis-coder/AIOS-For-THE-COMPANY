"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DocsSidebarLink({ slug, title }: { slug: string; title: string }) {
  const pathname = usePathname();
  const active = pathname === `/docs/${slug}`;

  return (
    <Link
      href={`/docs/${slug}`}
      className={`block truncate rounded-md px-2 py-1 text-[0.8rem] transition-colors ${
        active
          ? "bg-surface-hover font-bold text-foreground"
          : "text-text-dim hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {title}
    </Link>
  );
}
