"use client";

import { useState } from "react";
import { getAgentRun, runAgent } from "@/lib/api";

type Props = {
  agentType: string;
  label: string;
  organizationName: string;
  onCompleted?: () => void;
};

export function AgentRunButton({ agentType, label, organizationName, onCompleted }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function poll(runId: string) {
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const run = await getAgentRun(runId);
        setStatus(run.status);
        if (run.status === "completed" || run.status === "failed") {
          setSummary(run.summary);
          setRunning(false);
          if (run.status === "completed") onCompleted?.();
          return;
        }
      } catch {
        // keep polling; a transient failure shouldn't stop the loop
      }
    }
    setRunning(false);
    setError("Timed out waiting for the agent to finish.");
  }

  async function handleClick() {
    setRunning(true);
    setError(null);
    setSummary(null);
    try {
      const { run_id, status: initialStatus } = await runAgent(agentType, { organization_name: organizationName });
      setStatus(initialStatus);
      await poll(run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start agent");
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={running}
        className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {running ? `${label}...` : label}
      </button>
      {status && !error && (
        <p className="text-xs text-slate-500">
          Status: <span className="font-medium">{status}</span>
          {summary ? ` — ${summary}` : ""}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
