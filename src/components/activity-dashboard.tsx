"use client";

import Link from "next/link";
import { ArrowUpRight, Bell, CalendarDays, MessageCircle, Plus, Radio, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getList } from "@/lib/api";
import type { Broadcast, ChatRoom, Notification } from "@/lib/types";
import { EmptyState } from "./ui";

type DashboardData = { broadcasts: Broadcast[]; chats: ChatRoom[]; notifications: Notification[] };

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function ActivityDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    useEffect(() => {
        Promise.all([
            getList<Broadcast>("/broadcasts/me/received?limit=3"),
            getList<ChatRoom>("/chat/me/rooms?limit=3"),
            getList<Notification>("/notifications?limit=3&unreadOnly=true"),
        ]).then(([broadcasts, chats, notifications]) => setData({ broadcasts: broadcasts.data ?? [], chats: chats.data ?? [], notifications: notifications.data ?? [] }))
            .catch(() => setData({ broadcasts: [], chats: [], notifications: [] }));
    }, []);

    const summaries = [
        { label: "Invitations", value: data?.broadcasts.length ?? 0, icon: Radio, href: "/broadcasts", tone: "bg-accent-subtle text-accent" },
        { label: "Unread updates", value: data?.notifications.length ?? 0, icon: Bell, href: "/notifications", tone: "bg-[#f7ecd8] text-warning" },
        { label: "Open chats", value: data?.chats.length ?? 0, icon: MessageCircle, href: "/chat", tone: "bg-[#e7edf6] text-[#456c94]" },
    ];

    return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]"><section className="grid gap-6"><section className="overflow-hidden border border-ink bg-ink px-6 py-7 text-surface shadow-lg sm:px-8"><div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-xl"><p className="inline-flex items-center gap-2 text-sm font-semibold text-accent-subtle"><Sparkles className="size-4" />Your community, in motion</p><h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">A good plan is waiting to happen.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-surface/70">Share something you would genuinely enjoy, and let the right people nearby find it.</p></div><Link href="/broadcasts/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-accent-subtle px-3 text-sm font-semibold text-accent transition-transform hover:-translate-y-0.5"><Plus className="size-4" />Start a plan</Link></div></section><div className="grid gap-4 sm:grid-cols-3">{summaries.map(({ label, value, icon: Icon, href, tone }) => <Link href={href} key={label} className="group border border-border bg-surface p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-accent hover:shadow-md"><div className="flex items-center justify-between"><span className={`grid size-9 place-items-center rounded-md ${tone}`}><Icon className="size-4" /></span><ArrowUpRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" /></div><p className="mt-5 text-3xl font-bold tracking-tight text-ink">{data ? value : "-"}</p><p className="mt-1 text-sm font-medium text-ink-muted">{label}</p></Link>)}</div><section className="border border-border bg-surface shadow-sm"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">Close to you</p><h2 className="mt-1 font-semibold text-ink">Nearby invitations</h2></div><Link href="/broadcasts" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover">View all <ArrowUpRight className="size-4" /></Link></div>{data === null ? <div className="h-52 animate-pulse bg-surface-muted" /> : data.broadcasts.length ? <div>{data.broadcasts.map((broadcast) => <Link href="/broadcasts" key={broadcast._id} className="group flex gap-4 border-b border-border px-5 py-4 last:border-0 hover:bg-surface-muted/70"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-subtle text-accent"><CalendarDays className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink">{broadcast.message}</strong><span className="mt-1 block text-sm text-ink-muted">{formatDate(broadcast.eventDate)} · {broadcast.postalCode}</span></span><ArrowUpRight className="mt-1 size-4 text-ink-muted group-hover:text-accent" /></Link>)}</div> : <EmptyState icon={<Radio className="size-5" />} title="Your next invitation will land here">Make sure your interests are current so the right local plans reach you.</EmptyState>}</section></section><aside className="border border-border bg-surface p-5 shadow-sm xl:self-start"><p className="text-xs font-semibold uppercase tracking-wide text-accent">Keep going</p><h2 className="mt-2 text-lg font-bold text-ink">Build your local circle</h2><p className="mt-2 text-sm leading-6 text-ink-muted">A few small actions help Comm Connect surface more meaningful people and plans.</p><div className="mt-6 grid gap-3"><Link href="/broadcasts/new" className="flex items-center gap-3 border border-border p-3 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-subtle"><span className="grid size-8 place-items-center rounded-md bg-accent-subtle text-accent"><Plus className="size-4" /></span>Create a broadcast</Link><Link href="/onboarding/interests" className="flex items-center gap-3 border border-border p-3 text-sm font-semibold text-ink transition-colors hover:border-accent hover:bg-accent-subtle"><span className="grid size-8 place-items-center rounded-md bg-accent-subtle text-accent"><Radio className="size-4" /></span>Refine interests</Link></div></aside></div>;
}