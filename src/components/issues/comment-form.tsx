"use client";

import { useRef, useState } from "react";
import { addComment } from "@/lib/actions/issues";
import { Button, TextArea } from "@/components/ui/field";

export function CommentForm({ issueId }: { issueId: string }) {
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setPending(true);
        await addComment(issueId, formData);
        formRef.current?.reset();
        setPending(false);
      }}
      className="flex flex-col gap-2"
    >
      <TextArea name="body" rows={2} placeholder="Add a comment…" required />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Posting…" : "Comment"}
      </Button>
    </form>
  );
}
