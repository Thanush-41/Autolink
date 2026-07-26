"use client";

import { useEffect, useState } from "react";
import {
  Comment,
  Draft,
  approveReply,
  classifyComments,
  listComments,
  listDrafts,
  proposeReply,
  seedComment
} from "@/lib/api";

const classificationColors: Record<string, string> = {
  sales_inquiry: "bg-emerald-100 text-emerald-700",
  question: "bg-blue-100 text-blue-700",
  thank_you: "bg-pink-100 text-pink-700",
  spam: "bg-slate-200 text-slate-600",
  troll: "bg-red-100 text-red-700",
  support: "bg-amber-100 text-amber-700",
  unclassified: "bg-slate-100 text-slate-500"
};

export function EngagementPanel() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [publishedDrafts, setPublishedDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [seedPostId, setSeedPostId] = useState("");
  const [seedAuthor, setSeedAuthor] = useState("");
  const [seedBody, setSeedBody] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [classifying, setClassifying] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [commentList, draftList] = await Promise.all([listComments(), listDrafts()]);
      setComments(commentList);
      setPublishedDrafts(draftList.filter((d) => d.linkedin_post_urn));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load engagement data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSeed(e: React.FormEvent) {
    e.preventDefault();
    setSeeding(true);
    setError(null);
    try {
      await seedComment({ post_id: seedPostId, author_name: seedAuthor, body: seedBody });
      setSeedAuthor("");
      setSeedBody("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed comment");
    } finally {
      setSeeding(false);
    }
  }

  async function handleClassify() {
    setClassifying(true);
    setError(null);
    try {
      await classifyComments();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setClassifying(false);
    }
  }

  async function handlePropose(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const result = await proposeReply(id);
      setDrafts((prev) => ({ ...prev, [id]: result.proposed_reply }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to propose reply");
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    setInfo(null);
    try {
      const result = await approveReply(id, drafts[id]);
      setInfo(`Reply published to LinkedIn: ${result.reply_comment_urn ?? "ok"}`);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to publish reply. This usually means the connected LinkedIn app lacks Marketing Developer Platform partner access (w_member_social_feed)."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-5 md:p-10">
      <section className="mb-6 panel p-6 reveal">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Engagement Agent</p>
        <h1 className="mb-2 text-3xl font-bold">Comments &amp; Replies</h1>
        <p className="mb-4 max-w-3xl text-sm text-slate-600">
          LinkedIn does not expose real incoming comments to self-serve apps, so seed a test comment on one of your
          published posts to exercise the classify → propose reply → approve pipeline end to end.
        </p>

        <form onSubmit={handleSeed} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            required
            value={seedPostId}
            onChange={(e) => setSeedPostId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          >
            <option value="">Select a published post...</option>
            {publishedDrafts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.type} · {d.content.slice(0, 40)}...
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Commenter name"
            value={seedAuthor}
            onChange={(e) => setSeedAuthor(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={seeding || !publishedDrafts.length}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {seeding ? "Adding..." : "Seed Comment"}
          </button>
          <textarea
            required
            placeholder="Comment text..."
            value={seedBody}
            onChange={(e) => setSeedBody(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-4"
            rows={2}
          />
        </form>
        {!publishedDrafts.length && (
          <p className="mt-2 text-xs text-amber-700">
            No published posts yet. Publish a draft from the Content page first.
          </p>
        )}
      </section>

      <section className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Comments ({comments.length})</h2>
        <div className="flex gap-3">
          <button onClick={handleClassify} disabled={classifying} className="text-sm font-medium text-slate-600 hover:underline">
            {classifying ? "Classifying..." : "Classify Unclassified"}
          </button>
          <button onClick={refresh} className="text-sm font-medium text-slate-600 hover:underline">
            Refresh
          </button>
        </div>
      </section>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {info && <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{info}</div>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500">No comments yet. Seed one above.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {comments.map((c) => (
            <article key={c.id} className="panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{c.author_name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classificationColors[c.classification] || "bg-slate-100"}`}>
                  {c.classification}
                </span>
              </div>
              <p className="mb-3 text-sm text-slate-700">{c.body}</p>

              {(drafts[c.id] || c.status === "reply_proposed") && (
                <textarea
                  value={drafts[c.id] ?? ""}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                />
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePropose(c.id)}
                  disabled={busyId === c.id}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busyId === c.id ? "Working..." : "Propose Reply"}
                </button>
                <button
                  onClick={() => handleApprove(c.id)}
                  disabled={busyId === c.id || !(drafts[c.id] || c.status === "reply_proposed")}
                  className="rounded-lg bg-[#0a66c2] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#004182] disabled:opacity-50"
                >
                  Approve &amp; Publish to LinkedIn
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
