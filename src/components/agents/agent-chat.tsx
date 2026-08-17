"use client";

import { useEffect, useRef, useState } from "react";
import { Button, TextArea } from "@/components/ui/field";

type Message = { role: "user" | "assistant"; content: string };

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
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
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
            Ask {agentTitle} a question, or say &ldquo;let&apos;s role-play a discovery call&rdquo;
            to practice.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.86rem] leading-relaxed " +
                (m.role === "user"
                  ? "ml-auto bg-accent text-on-accent"
                  : "mr-auto bg-surface-2 text-foreground")
              }
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
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
