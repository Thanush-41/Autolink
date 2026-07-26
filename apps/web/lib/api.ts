const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export type DashboardSnapshot = {
  pendingApproval: number;
  postsPublishedToday: number;
  commentsAwaitingReply: number;
  generatedDMs: number;
  leadOpportunities: number;
};

export type AgentStatus = {
  name: string;
  status: "online" | "idle" | "error";
  details: string;
};

export function getDashboardSnapshot() {
  return getJson<DashboardSnapshot>("/analytics/dashboard", {
    pendingApproval: 0,
    postsPublishedToday: 0,
    commentsAwaitingReply: 0,
    generatedDMs: 0,
    leadOpportunities: 0
  });
}

export function getAgentStatus() {
  return getJson<AgentStatus[]>("/agents/status", []);
}

export type LinkedInStatus = {
  connected: boolean;
  name?: string;
  email?: string;
  picture?: string;
  scopes?: string[];
  can_publish?: boolean;
};

export function getLinkedInStatus() {
  return getJson<LinkedInStatus>("/auth/linkedin/status", { connected: false });
}

export function getApiUrl() {
  return API_URL;
}

// ---- Client-side mutation / interactive data helpers ----
// These are called directly from client components (NEXT_PUBLIC_API_URL is
// exposed to the browser), so the dashboard can fully control the agents,
// drafts, engagement, and leads without leaving the web app.

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data && (data as { detail?: string }).detail) || `Request failed (${response.status})`);
  }
  return data as T;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data && (data as { detail?: string }).detail) || `Request failed (${response.status})`);
  }
  return data as T;
}

export type Draft = {
  id: string;
  type: string;
  content: string;
  status: string;
  scheduled_for: string | null;
  linkedin_post_urn: string | null;
};

export function listDrafts() {
  return fetchJson<Draft[]>("/posts/drafts");
}

export function publishDraft(postId: string) {
  return postJson<{ post_id: string; status: string; linkedin_post_urn: string | null }>(
    `/posts/${postId}/publish`
  );
}

export type AgentRun = {
  id: string;
  agent_type: string;
  status: string;
  summary: string | null;
  updated_at: string;
};

export function runAgent(agentType: string, payload: Record<string, unknown> = {}) {
  return postJson<{ run_id: string; status: string }>("/agents/run", { agent_type: agentType, payload });
}

export function getAgentRun(runId: string) {
  return fetchJson<AgentRun>(`/agents/runs/${runId}`);
}

export type Comment = {
  id: string;
  post_id: string;
  author_name: string;
  body: string;
  classification: string;
  status: string;
  proposed_reply?: string;
};

export function listComments() {
  return fetchJson<Comment[]>("/engagement/comments");
}

export function seedComment(payload: { post_id: string; author_name: string; body: string }) {
  return postJson<{ id: string }>("/engagement/comments/seed", payload);
}

export function classifyComments() {
  return postJson<{ classified: number }>("/engagement/comments/classify");
}

export function proposeReply(commentId: string) {
  return postJson<{ classification: string; proposed_reply: string; approval_required: boolean }>(
    `/engagement/comments/${commentId}/reply`
  );
}

export function approveReply(commentId: string, replyText?: string) {
  return postJson<{ comment_id: string; status: string; reply_comment_urn: string | null }>(
    `/engagement/comments/${commentId}/approve`,
    replyText ? { reply_text: replyText } : {}
  );
}

export type DmDraft = {
  id: string;
  lead_name: string;
  message: string;
  status: string;
};

export function listDmDrafts() {
  return fetchJson<DmDraft[]>("/leads/dm-drafts");
}

export function detectLead(payload: { name: string; comment: string; comment_id?: string }) {
  return postJson<{ is_lead: boolean; suggested_reply?: string; suggested_dm?: string; dm_draft_id?: string }>(
    "/leads/detect",
    payload
  );
}

export function markDmSent(draftId: string) {
  return postJson<{ id: string; status: string }>(`/leads/dm-drafts/${draftId}/mark-sent`);
}

export type GoalPayload = {
  client: string;
  industry: string;
  audience: string;
  goals: string[];
  brandVoice: string;
};

export function createGoal(payload: GoalPayload) {
  return postJson<{ goal_id: string; strategy: { monthly_strategy: Record<string, unknown> } }>(
    "/goals",
    payload
  );
}

export type LinkedInAppCredentials = {
  configured: boolean;
  client_id: string | null;
  redirect_uri: string;
};

export function getAppCredentials() {
  return fetchJson<LinkedInAppCredentials>("/auth/linkedin/app-credentials");
}

export function saveAppCredentials(clientId: string, clientSecret: string) {
  return postJson<LinkedInAppCredentials>("/auth/linkedin/app-credentials", {
    client_id: clientId,
    client_secret: clientSecret
  });
}

export function enhanceContent(content: string, hasImage: boolean) {
  return postJson<{ enhanced: string }>("/posts/enhance", { content, has_image: hasImage });
}

export type CreatePostResult = {
  post_id: string;
  status: "published" | "scheduled";
  linkedin_post_urn?: string | null;
  scheduled_for?: string;
};

export async function createPost(params: { content: string; image?: File | null; publishAt?: string | null }) {
  const form = new FormData();
  form.append("content", params.content);
  if (params.publishAt) form.append("publish_at", params.publishAt);
  if (params.image) form.append("image", params.image);

  const response = await fetch(`${API_URL}/posts/create`, {
    method: "POST",
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data && (data as { detail?: string }).detail) || `Request failed (${response.status})`);
  }
  return data as CreatePostResult;
}
