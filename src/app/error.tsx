"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/field";

/** Catches a render/data error anywhere below the root layout — the
 *  sidebar and app chrome stay intact, only the page content is replaced.
 *  Previously an unhandled error fell through to Next's generic, unstyled
 *  crash page with no way back into the app short of typing a new URL. */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
      <Card className="flex w-full flex-col items-center gap-3 p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-critical/10 text-critical">
          <AlertTriangle size={20} />
        </span>
        <h1 className="text-lg font-extrabold tracking-tight">Something went wrong</h1>
        <p className="max-w-[42ch] text-[0.85rem] text-text-dim">
          This page hit an unexpected error. It&rsquo;s been logged — try again, or head back and pick up where you
          left off.
        </p>
        {error.digest && <p className="font-mono text-[0.7rem] text-text-faint">ref: {error.digest}</p>}
        <div className="mt-2 flex items-center gap-2">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/">
            <Button type="button" variant="ghost">
              Back home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
