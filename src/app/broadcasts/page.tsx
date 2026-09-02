import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BroadcastStatusWorkspace } from "@/components/broadcast-status-workspace";

export default function BroadcastsPage() { return <AppShell title="Broadcasts" description="Follow the status of plans you created and invitations you received." action={<Link href="/broadcasts/new" className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-surface hover:bg-accent-hover">
    <Plus className="size-4" />Create broadcast</Link>}><BroadcastStatusWorkspace /></AppShell>; }