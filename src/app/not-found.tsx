import Link from "next/link";
import { Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/field";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
      <Card className="flex w-full flex-col items-center gap-3 p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-wash text-accent-strong">
          <Compass size={20} />
        </span>
        <h1 className="text-lg font-extrabold tracking-tight">Page not found</h1>
        <p className="max-w-[42ch] text-[0.85rem] text-text-dim">
          Nothing lives at this address — it may have moved, or the link was mistyped.
        </p>
        <Link href="/" className="mt-2">
          <Button type="button">Back home</Button>
        </Link>
      </Card>
    </div>
  );
}
