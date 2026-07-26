"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LinkedInDisconnectButton({ apiUrl }: { apiUrl: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    setLoading(true);
    try {
      await fetch(`${apiUrl}/auth/linkedin/disconnect`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={loading}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? "Disconnecting..." : "Disconnect LinkedIn"}
    </button>
  );
}
