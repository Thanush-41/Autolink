"use client";

import { useEffect, useState } from "react";
import { DmDraft, detectLead, listDmDrafts, markDmSent } from "@/lib/api";

const statusColors: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  sent_manually: "bg-emerald-100 text-emerald-700"
};

export function LeadsPanel() {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<DmDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setDrafts(await listDmDrafts());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DM drafts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDetect(e: React.FormEvent) {
    e.preventDefault();
    setDetecting(true);
    setError(null);
    setLastResult(null);
    try {
      const result = await detectLead({ name, comment });
      setLastResult(result.is_lead ? "Lead detected — DM draft created below." : "Not detected as a lead.");
      if (result.is_lead) {
        setName("");
        setComment("");
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lead detection failed");
    } finally {
      setDetecting(false);
    }
  }

  async function handleMarkSent(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await markDmSent(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update DM draft");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-5 md:p-10">
      <section className="mb-6 panel p-6 reveal">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Lead Agent</p>
        <h1 className="mb-2 text-3xl font-bold">Leads &amp; DM Drafts</h1>
        <p className="mb-4 max-w-3xl text-sm text-slate-600">
          Paste a comment to check if it signals sales intent. If it does, a personalized DM draft is generated.
          Note: LinkedIn has no public messaging API for self-serve apps, so DMs must be sent manually — this just
          tracks that you did.
        </p>

        <form onSubmit={handleDetect} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            required
            placeholder="Commenter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            required
            placeholder="Comment text (e.g. 'interested, what's pricing look like?')"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            rows={1}
          />
          <button
            type="submit"
            disabled={detecting}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {detecting ? "Checking..." : "Detect Lead"}
          </button>
        </form>
        {lastResult && <p className="mt-2 text-sm text-slate-600">{lastResult}</p>}
      </section>

      <section className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">DM Drafts ({drafts.length})</h2>
        <button onClick={refresh} className="text-sm font-medium text-slate-600 hover:underline">
          Refresh
        </button>
      </section>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading DM drafts...</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-slate-500">No DM drafts yet. Detect a lead above.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {drafts.map((d) => (
            <article key={d.id} className="panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{d.lead_name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[d.status] || "bg-slate-100"}`}>
                  {d.status}
                </span>
              </div>
              <p className="mb-3 text-sm text-slate-700">{d.message}</p>
              {d.status !== "sent_manually" && (
                <button
                  onClick={() => handleMarkSent(d.id)}
                  disabled={busyId === d.id}
                  className="rounded-lg bg-[#0a66c2] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#004182] disabled:opacity-50"
                >
                  {busyId === d.id ? "Updating..." : "Mark as Sent"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
