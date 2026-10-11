"use client";

/** Last-resort screen when the root layout itself fails. Plain styles: the app's CSS may not have loaded. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f7f9fc", margin: 0 }}>
        <div style={{ maxWidth: 520, margin: "80px auto", padding: 24, background: "#fff", border: "1px solid #e3e8f2", borderRadius: 16 }}>
          <h1 style={{ fontSize: 18, margin: 0, color: "#0f1b33" }}>Pulse Delivery hit a problem</h1>
          <p style={{ color: "#5b6b88", fontSize: 14 }}>Anything you saved before this is safe. Reload to continue.</p>
          <p style={{ fontFamily: "monospace", fontSize: 12, color: "#5b6b88", background: "#f3f5f9", padding: 8, borderRadius: 8, wordBreak: "break-word" }}>
            {error.message || "Unknown error"}
            {error.digest ? ` (ref ${error.digest})` : ""}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: "#1e56d9", color: "#fff", border: 0, borderRadius: 10, padding: "10px 16px", fontSize: 14, cursor: "pointer" }}
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
