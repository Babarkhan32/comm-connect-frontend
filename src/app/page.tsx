"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ActivityDashboard } from "@/components/activity-dashboard";

export default function Home() {
  return <AppShell title="Good to see you" description="A quick view of your community activity." action={<Link href="/broadcasts/new" className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-surface shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-md"><Plus className="size-4" />Create broadcast</Link>}><ActivityDashboard /></AppShell>;
}
