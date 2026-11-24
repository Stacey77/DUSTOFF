"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { business } from "@/lib/business";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();
  const bottom = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <main className="flex h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="font-semibold">{business.name}</h1>
        <p className="text-sm text-zinc-500">{business.tagline}</p>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-y-auto px-4 py-6">
        <Bubble role="assistant">{business.greeting}</Bubble>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {business.suggestions.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
          </Bubble>
        ))}
        {status === "submitted" && <Bubble role="assistant"><span className="animate-pulse">…</span></Bubble>}
        {error && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
        <div ref={bottom} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="mx-auto flex w-full max-w-2xl gap-2 px-4 pb-6">
        <input value={input} onChange={(e) => setInput(e.currentTarget.value)} placeholder="Type your question…"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900" />
        <button disabled={busy || !input.trim()}
          className="rounded-xl bg-zinc-900 px-5 font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900">
          Send
        </button>
      </form>
    </main>
  );
}

function Bubble({ role, children }: { role: string; children: React.ReactNode }) {
  const user = role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 ${
        user ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
             : "bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"}`}>
        {children}
      </div>
    </div>
  );
}
