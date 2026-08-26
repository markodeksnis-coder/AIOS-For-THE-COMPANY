"use client";

// The last line of defense — fires only if the root layout itself throws,
// so unlike error.tsx this can't assume the layout (sidebar, fonts, theme
// script) rendered at all. Kept deliberately plain and self-contained:
// its own <html>/<body>, inline styles only, no dependency on anything
// that might be exactly what just broke.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0d12",
          color: "#e6e8ee",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "28rem", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Company OS hit an unexpected error
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#a3a9b8", marginBottom: "1.5rem" }}>
            The app failed to load. Try reloading — if it keeps happening, this has been logged already.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#4a55c4",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.55rem 1.1rem",
              fontSize: "0.83rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
