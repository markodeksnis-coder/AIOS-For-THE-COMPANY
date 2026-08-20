"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, TextArea } from "@/components/ui/field";

type Action = { tool: string; summary: string };
type Message = { role: "user" | "assistant"; content: string; actions?: Action[] };

export function AgentChat({ agentSlug, agentTitle }: { agentSlug: string; agentTitle: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setPending(true);

    try {
      const res = await fetch(`/api/agents/${agentSlug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, actions: data.actions?.length ? data.actions : undefined },
      ]);
    } catch {
      setError("Couldn't reach the agent — check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface p-4">
        {messages.length === 0 && (
          <p className="text-[0.85rem] text-text-faint">
            Ask {agentTitle} a question, or ask it to create or update an Issue, Project, or
            Scorecard entry for you.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={"flex flex-col gap-1.5 " + (m.role === "user" ? "items-end" : "items-start")}>
              <div
                className={
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.86rem] leading-relaxed " +
                  (m.role === "user" ? "bg-accent text-on-accent" : "bg-surface-2 text-foreground")
                }
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              {m.actions && (
                <div className="flex max-w-[80%] flex-col gap-1">
                  {m.actions.map((a, j) => (
                    <div
                      key={j}
                      className="flex items-center gap-1.5 rounded-full bg-good-wash px-3 py-1 text-[0.72rem] font-bold text-good"
                    >
                      <CheckCircle2 size={12} />
                      {a.summary}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {pending && (
            <div className="mr-auto rounded-2xl bg-surface-2 px-4 py-2.5 text-[0.86rem] text-text-faint">
              Thinking…
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-[0.78rem] text-critical">{error}</p>}

      <div className="mt-3 flex gap-2">
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message… (Enter to send, Shift+Enter for a new line)"
          rows={2}
          className="flex-1 resize-none"
        />
        <Button onClick={send} disabled={pending || !input.trim()}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
