"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LinkedInStatus, getLinkedInStatus } from "@/lib/api";

function IconCreate() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const links = [
  { href: "/", label: "Create Post", icon: IconCreate },
  { href: "/settings", label: "Settings", icon: IconSettings }
];

export function Sidebar() {
  const pathname = usePathname();
  const [account, setAccount] = useState<LinkedInStatus | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getLinkedInStatus()
      .then(setAccount)
      .catch(() => setAccount({ connected: false }));
  }, [pathname]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar - only visible below the md breakpoint */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/[0.06] bg-white/90 px-4 py-3 backdrop-blur-sm md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-black/[0.04]"
        >
          <IconMenu />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-xs font-bold text-white">A</div>
          <p className="text-sm font-bold">Autolink</p>
        </div>
        <span className="w-9" />
      </div>

      {/* Backdrop, mobile only, shown while drawer is open */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-black/[0.06] bg-white px-4 py-6 transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 md:bg-white/70 md:backdrop-blur-sm ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white">A</div>
            <div>
              <p className="text-sm font-bold leading-tight">Autolink</p>
              <p className="text-[11px] leading-tight text-slate-500">AI Growth Employee</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-black/[0.04] md:hidden"
          >
            <IconClose />
          </button>
        </div>

      <nav className="flex flex-1 flex-col gap-1">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href as never}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-ink text-white shadow-sm" : "text-slate-600 hover:bg-black/[0.04]"
              }`}
            >
              <Icon />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg border border-black/[0.06] bg-white p-3">
        {account?.connected ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-500">
              {account.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.picture} alt={account.name || "LinkedIn"} className="h-full w-full object-cover" />
              ) : (
                "in"
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{account.name}</p>
              <p className="text-[11px] text-emerald-600">Connected</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">LinkedIn not connected</p>
            <Link href="/settings" className="text-xs font-semibold text-coral hover:underline">
              Connect
            </Link>
          </div>
        )}
      </div>
      </aside>
    </>
  );
}
