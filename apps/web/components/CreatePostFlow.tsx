"use client";

import { useEffect, useState } from "react";
import {
  LinkedInAppCredentials,
  LinkedInStatus,
  createPost,
  enhanceContent,
  getAppCredentials,
  getApiUrl,
  getLinkedInStatus,
  saveAppCredentials
} from "@/lib/api";

type Step = "loading" | "needs-credentials" | "needs-connect" | "ready";

export function CreatePostFlow() {
  const [step, setStep] = useState<Step>("loading");
  const [credentials, setCredentials] = useState<LinkedInAppCredentials | null>(null);
  const [account, setAccount] = useState<LinkedInStatus | null>(null);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsError, setCredsError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; linkedin_post_urn?: string | null; scheduled_for?: string } | null>(
    null
  );

  async function loadGateState() {
    const [creds, acc] = await Promise.all([getAppCredentials(), getLinkedInStatus()]);
    setCredentials(creds);
    setAccount(acc);
    if (!creds.configured) {
      setStep("needs-credentials");
    } else if (!acc.connected) {
      setStep("needs-connect");
    } else {
      setStep("ready");
    }
  }

  useEffect(() => {
    loadGateState();
  }, []);

  async function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setSavingCreds(true);
    setCredsError(null);
    try {
      await saveAppCredentials(clientId.trim(), clientSecret.trim());
      // Clear the secret from memory immediately after it's been sent - it's
      // never displayed or needed again on the client.
      setClientId("");
      setClientSecret("");
      await loadGateState();
    } catch (err) {
      setCredsError(err instanceof Error ? err.message : "Failed to save credentials");
    } finally {
      setSavingCreds(false);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleEnhance() {
    if (!content.trim()) return;
    setEnhancing(true);
    setPostError(null);
    try {
      const { enhanced: text } = await enhanceContent(content, !!image);
      setEnhanced(text);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Failed to enhance content");
    } finally {
      setEnhancing(false);
    }
  }

  async function handleSubmit(mode: "now" | "schedule") {
    const finalContent = (enhanced || content).trim();
    if (!finalContent) {
      setPostError("Write something first.");
      return;
    }
    if (mode === "schedule" && !scheduleAt) {
      setPostError("Pick a date and time to schedule for.");
      return;
    }

    setSubmitting(true);
    setPostError(null);
    setResult(null);
    try {
      const publishAt = mode === "schedule" ? new Date(scheduleAt).toISOString() : null;
      const res = await createPost({ content: finalContent, image, publishAt });
      setResult(res);
      setContent("");
      setEnhanced("");
      setImage(null);
      setImagePreview(null);
      setScheduleAt("");
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Failed to publish post");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "loading") {
    return (
      <main className="mx-auto max-w-2xl p-5 md:p-10">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  if (step === "needs-credentials") {
    return (
      <main className="mx-auto max-w-2xl p-5 md:p-10">
        <section className="panel p-6 reveal">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Step 1</p>
          <h1 className="mb-2 text-2xl font-bold">Connect your LinkedIn App</h1>
          <p className="mb-4 text-sm text-slate-600">
            Enter the Client ID and Client Secret from your LinkedIn Developer app. Make sure{" "}
            <code className="rounded bg-slate-100 px-1">{credentials?.redirect_uri}</code> is added as an authorized
            redirect URL in that app&apos;s OAuth settings.
          </p>
          <form onSubmit={handleSaveCredentials} className="flex flex-col gap-3">
            <input
              required
              placeholder="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              type="password"
              placeholder="Client Secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={savingCreds}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {savingCreds ? "Saving..." : "Save Credentials"}
            </button>
          </form>
          {credsError && <p className="mt-3 text-sm text-red-600">{credsError}</p>}
        </section>
      </main>
    );
  }

  if (step === "needs-connect") {
    return (
      <main className="mx-auto max-w-2xl p-5 md:p-10">
        <section className="panel p-6 reveal">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Step 2</p>
          <h1 className="mb-2 text-2xl font-bold">Connect Your LinkedIn Account</h1>
          <p className="mb-4 text-sm text-slate-600">
            LinkedIn app credentials are saved. Now connect your LinkedIn account to allow
            publishing.
          </p>
          <a
            href={`${getApiUrl()}/auth/linkedin/login`}
            className="inline-block rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#004182]"
          >
            Connect LinkedIn
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-5 md:p-10">
      <section className="mb-4 panel p-4 reveal flex items-center gap-3">
        {account?.picture && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.picture} alt={account.name} className="h-9 w-9 rounded-full object-cover" />
        )}
        <p className="text-sm text-slate-600">
          Posting as <strong>{account?.name}</strong>
        </p>
      </section>

      <section className="panel p-6 reveal">
        <h1 className="mb-4 text-2xl font-bold">Create Post</h1>

        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setEnhanced("");
          }}
          placeholder="Write what you want to post about..."
          rows={5}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <label className="mb-3 flex items-center gap-3 text-sm text-slate-600">
          <input type="file" accept="image/*" onChange={handleImageChange} />
          <span className="text-xs text-slate-400">Optional image</span>
        </label>
        {imagePreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePreview} alt="Preview" className="mb-3 max-h-48 rounded-lg border border-slate-200 object-cover" />
        )}

        <button
          onClick={handleEnhance}
          disabled={enhancing || !content.trim()}
          className="mb-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {enhancing ? "Enhancing with AI..." : "Enhance with AI"}
        </button>

        {enhanced && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">AI-enhanced preview (editable)</p>
            <textarea
              value={enhanced}
              onChange={(e) => setEnhanced(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center">
          <button
            onClick={() => handleSubmit("now")}
            disabled={submitting || !(enhanced || content).trim()}
            className="rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#004182] disabled:opacity-50"
          >
            {submitting ? "Working..." : "Publish Now"}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => handleSubmit("schedule")}
              disabled={submitting || !(enhanced || content).trim() || !scheduleAt}
              className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Schedule
            </button>
          </div>
        </div>

        {postError && <p className="mt-4 text-sm text-red-600">{postError}</p>}

        {result && (
          <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            {result.status === "published" ? (
              <p>Published to LinkedIn — {result.linkedin_post_urn}</p>
            ) : (
              <p>Scheduled for {new Date(result.scheduled_for as string).toLocaleString()}</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
