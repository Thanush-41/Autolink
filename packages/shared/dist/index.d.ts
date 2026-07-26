export type AgentType = "strategy" | "research" | "content" | "review" | "scheduling" | "publishing" | "engagement" | "lead" | "dm" | "analytics" | "optimization";
export interface GoalInput {
    client: string;
    industry: string;
    audience: string;
    goals: string[];
    brandVoice: string;
}
export interface AgentRun {
    id: number;
    agentType: AgentType;
    status: "queued" | "running" | "completed" | "failed";
    summary?: string;
    createdAt: string;
}
export interface DashboardSnapshot {
    pendingApproval: number;
    postsPublishedToday: number;
    commentsAwaitingReply: number;
    leadOpportunities: number;
    generatedDMs: number;
}
