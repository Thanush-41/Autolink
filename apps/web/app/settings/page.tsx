import Image from "next/image";
import { getApiUrl, getLinkedInStatus } from "@/lib/api";
import { LinkedInDisconnectButton } from "@/components/LinkedInDisconnectButton";

type SearchParams = {
  linkedin_connected?: string;
  linkedin_error?: string;
};

export default async function SettingsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const [status, apiUrl] = await Promise.all([getLinkedInStatus(), Promise.resolve(getApiUrl())]);

  return (
    <main className="mx-auto max-w-3xl p-5 md:p-10">
      <section className="mb-6 panel p-6 reveal">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Settings</p>
        <h1 className="mb-2 text-3xl font-bold">Connected Accounts</h1>
        <p className="max-w-2xl text-slate-600">
          Link your LinkedIn account so agents can publish posts, monitor engagement, and manage DMs on your behalf.
        </p>
      </section>

      {searchParams.linkedin_connected && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
          LinkedIn connected successfully.
        </div>
      )}
      {searchParams.linkedin_error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          LinkedIn connection failed: {searchParams.linkedin_error}
        </div>
      )}

      <section className="panel p-6 reveal">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {status.picture ? (
              <Image
                src={status.picture}
                alt={status.name || "LinkedIn profile"}
                width={56}
                height={56}
                className="rounded-full"
                unoptimized
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-xl font-semibold text-slate-500">
                in
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold">LinkedIn</h2>
              {status.connected ? (
                <p className="text-sm text-slate-600">
                  {status.name} {status.email ? `· ${status.email}` : ""}
                </p>
              ) : (
                <p className="text-sm text-slate-500">Not connected</p>
              )}
            </div>
          </div>

          {status.connected ? (
            <LinkedInDisconnectButton apiUrl={apiUrl} />
          ) : (
            <a
              href={`${apiUrl}/auth/linkedin/login`}
              className="rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004182]"
            >
              Connect LinkedIn
            </a>
          )}
        </div>

        {status.connected && !status.can_publish && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              This account can&apos;t publish posts yet &mdash; it&apos;s missing the{" "}
              <code className="rounded bg-amber-100 px-1">w_member_social</code> permission. Reconnect to grant
              posting access.
            </p>
            <a
              href={`${apiUrl}/auth/linkedin/login`}
              className="whitespace-nowrap rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-700 sm:ml-4"
            >
              Reconnect
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
