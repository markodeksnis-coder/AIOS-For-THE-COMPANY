"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button, Label, TextInput } from "@/components/ui/field";

function SiteLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/site-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Wrong password.");
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-24">
      <Card className="w-full p-8">
        <h1 className="mb-1 text-lg font-extrabold tracking-tight">Company OS</h1>
        <p className="mb-5 text-[0.85rem] text-text-dim">Enter the site password to continue.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label>Password</Label>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              className="w-full"
            />
          </div>
          {error && <p className="text-[0.8rem] text-critical">{error}</p>}
          <Button type="submit" disabled={pending || !password}>
            {pending ? "Checking…" : "Enter"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function SiteLoginPage() {
  return (
    <Suspense>
      <SiteLoginForm />
    </Suspense>
  );
}
