"use client";

import { useState } from "react";
import { createGoal } from "@/lib/api";

export function GoalForm() {
  const [client, setClient] = useState("TNEX");
  const [industry, setIndustry] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<Record<string, unknown> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setStrategy(null);
    try {
      const result = await createGoal({
        client,
        industry,
        audience,
        goals: [goal],
        brandVoice
      });
      setStrategy(result.strategy.monthly_strategy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-6 panel p-6 reveal">
      <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Strategy Agent</p>
      <h2 className="mb-4 text-2xl font-bold">Define a Growth Goal</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          required
          placeholder="Client / organization name"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Target audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Brand voice (e.g. confident, direct)"
          value={brandVoice}
          onChange={(e) => setBrandVoice(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Primary goal (e.g. generate qualified demo requests)"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 md:col-span-2"
        >
          {submitting ? "Generating strategy..." : "Generate Strategy"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {strategy && (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="mb-1 font-semibold">{String(strategy.campaign)}</p>
          <p className="mb-2">Cadence: {String(strategy.posting_frequency)}</p>
          <ul className="list-inside list-disc">
            {(strategy.content_pillars as string[]).map((pillar) => (
              <li key={pillar}>{pillar}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-emerald-700">
            Now head to the Content page and generate drafts using this organization name.
          </p>
        </div>
      )}
    </section>
  );
}
