"use client";

import { useEffect, useState } from "react";
import { AgentRunButton } from "@/components/AgentRunButton";
import { Draft, listDrafts, publishDraft } from "@/lib/api";

const statusColors: Record<string, string> = {
  draft: "bg-slate-200 text-slate-700",
  scheduled: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700"
};

export function ContentStudio() {
  const [orgName, setOrgName] = useState("TNEX");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setDrafts(await listDrafts());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handlePublish(id: string) {
    setPublishingId(id);
    setError(null);
    try {
      await publishDraft(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-5 md:p-10">
      <section className="mb-6 panel p-6 reveal">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Content Agent</p>
        <h1 className="mb-4 text-3xl font-bold">Content Studio</h1>

        <label className="mb-4 block max-w-sm">
          <span className="mb-1 block text-sm font-medium text-slate-600">Organization name</span>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="TNEX"
          />
        </label>

        <div className="flex flex-wrap gap-4">
          <AgentRunButton
            agentType="content"
            label="Generate 10 New Drafts"
            organizationName={orgName}
            onCompleted={refresh}
          />
          <AgentRunButton
            agentType="scheduling"
            label="Schedule Drafts"
            organizationName={orgName}
            onCompleted={refresh}
          />
        </div>
      </section>

      <section className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Drafts ({drafts.length})</h2>
        <button onClick={refresh} className="text-sm font-medium text-slate-600 hover:underline">
          Refresh
        </button>
      </section>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading drafts...</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-slate-500">No drafts yet. Generate some above.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {drafts.map((draft) => (
            <article key={draft.id} className="panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{draft.type}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[draft.status] || "bg-slate-200"}`}>
                  {draft.status}
                </span>
              </div>
              <p className="mb-3 whitespace-pre-wrap text-sm text-slate-700">{draft.content}</p>
              {draft.scheduled_for && (
                <p className="mb-2 text-xs text-slate-500">Scheduled for: {new Date(draft.scheduled_for).toLocaleString()}</p>
              )}
              {draft.linkedin_post_urn ? (
                <p className="text-xs font-medium text-emerald-700">Published · {draft.linkedin_post_urn}</p>
              ) : (
                <button
                  onClick={() => handlePublish(draft.id)}
                  disabled={publishingId === draft.id}
                  className="rounded-lg bg-[#0a66c2] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#004182] disabled:opacity-50"
                >
                  {publishingId === draft.id ? "Publishing..." : "Publish to LinkedIn"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
