import sqlite3

import anthropic

from app.config import settings

SYSTEM_PROMPT = (
    "You are the AIOS company knowledge assistant. Answer the user's question using ONLY the "
    "provided context chunks. Each chunk is labeled with a [n] marker. Cite the chunks you used "
    "inline like [1] or [2]. If the context doesn't contain the answer, say so plainly instead "
    "of guessing."
)


def answer_question(question: str, chunks: list[sqlite3.Row]) -> str:
    if not settings.anthropic_api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not configured. Set it in the environment to enable answers."
        )

    context = "\n\n".join(
        f"[{i + 1}] source={row['source']} title={row['title'] or 'untitled'}\n{row['content']}"
        for i, row in enumerate(chunks)
    )
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {question}",
            }
        ],
    )
    return "".join(block.text for block in message.content if block.type == "text")
