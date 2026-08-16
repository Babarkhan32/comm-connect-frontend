"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Inbox, Radio } from "lucide-react";
import { api, getList } from "@/lib/api";
import type { Broadcast } from "@/lib/types";
import { showToast } from "./toast";
import { Card, EmptyState } from "./ui";

function formatEventDate(value: unknown) {
    const date = new Date(typeof value === "string" || typeof value === "number" ? value : "");
    if (Number.isNaN(date.getTime())) return "Date to be confirmed";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function BroadcastStatusCard({ broadcast, created, onRespond, responding }: { broadcast: Broadcast; created: boolean; onRespond?: (id: string, response: "accept" | "pass") => void; responding?: boolean }) {
    const date = formatEventDate(broadcast.eventDate);
    const eventTime = new Date(broadcast.eventDate).getTime();
    const isExpired = broadcast.status === "EXPIRED" || (!Number.isNaN(eventTime) && eventTime <= Date.now());
    const displayStatus = isExpired ? "EXPIRED" : (created ? broadcast.status : broadcast.recipientStatus ?? "PENDING");
    const maxParticipants = Math.max(Number(broadcast.maxParticipants) || 0, 1);
    const participantCount = Math.max(Number(broadcast.participantCount) || 0, 0);
    const participantPercent = Math.min((participantCount / maxParticipants) * 100, 100);
    const isActive = displayStatus === "ACTIVE" || displayStatus === "PENDING";

    const cardContent = <>
        <div className={`absolute inset-y-0 left-0 w-1 ${isActive ? "bg-accent" : "bg-border"}`} />
        <div className="pl-2">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{created ? "Your broadcast" : "Invitation"}</p>
                    <h3 className="mt-2 text-base font-semibold leading-6 text-ink">{broadcast.message}</h3>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${isActive ? "border-accent bg-accent-subtle text-accent" : "border-border bg-surface-muted text-ink-muted"}`}>{displayStatus}</span>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted"><span className="grid size-7 place-items-center rounded-md bg-accent-subtle text-accent"><CalendarDays className="size-3.5" /></span>{date} · {broadcast.postalCode}</p>
            {!created && displayStatus === "PENDING" && onRespond && <div className="mt-5 flex gap-2"><button type="button" disabled={responding} onClick={() => onRespond(broadcast._id, "accept")} className="h-9 rounded-md bg-accent px-3 text-sm font-semibold text-surface transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">{responding ? "Saving..." : "Accept"}</button><button type="button" disabled={responding} onClick={() => onRespond(broadcast._id, "pass")} className="h-9 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60">Decline</button></div>}
            <div className="mt-5 border-t border-border pt-4">
                <div className="flex items-center justify-between text-xs font-semibold"><span className="text-ink-muted">Participation</span><span className="text-ink">{participantCount} <span className="font-normal text-ink-muted">of {maxParticipants}</span></span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${participantPercent}%` }} /></div>
            </div>
        </div>
    </>;

    if (created) return <Card as={Link} href={`/broadcasts/${broadcast._id}`} interactive className="group relative block overflow-hidden p-5">{cardContent}</Card>;
    return <Card as="article" interactive className="group relative overflow-hidden p-5">{cardContent}</Card>;
}

export function BroadcastStatusWorkspace() {
    const searchParams = useSearchParams();
    const [created, setCreated] = useState<Broadcast[] | null>(null);
    const [received, setReceived] = useState<Broadcast[] | null>(null);
    const [activeTab, setActiveTab] = useState<"sent" | "received">(searchParams.get("tab") === "received" ? "received" : "sent");
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([getList<Broadcast>("/broadcasts/me/created"), getList<Broadcast>("/broadcasts/me/received?limit=30")])
            .then(([createdResult, receivedResult]) => { setCreated(createdResult.data ?? []); setReceived(receivedResult.data ?? []); })
            .catch((reason: Error) => { setError(reason.message); setCreated([]); setReceived([]); });
    }, []);

    useEffect(() => {
        setActiveTab(searchParams.get("tab") === "received" ? "received" : "sent");
    }, [searchParams]);

    if (created === null || received === null) return <div className="h-80 animate-pulse bg-surface-muted" />;

    async function respond(id: string, response: "accept" | "pass") {
        setRespondingId(id);
        setError("");
        try {
            const result = await api<{ participantCount?: number }>(`/broadcasts/${id}/${response}`, { method: "PATCH" });
            setReceived((current) => current?.map((broadcast) => broadcast._id === id ? { ...broadcast, recipientStatus: response === "accept" ? "ACCEPTED" : "PASSED", participantCount: response === "accept" && typeof result.participantCount === "number" ? result.participantCount : broadcast.participantCount } : broadcast) ?? []);
            showToast(response === "accept" ? "Broadcast accepted. You can now coordinate in chat." : "Invitation declined.", "success");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not update the invitation.");
        } finally {
            setRespondingId(null);
        }
    }

    const isSent = activeTab === "sent";
    const broadcasts = isSent ? created : received;

    return (
        <div className="grid gap-6">
            <div className="inline-flex w-fit border border-border bg-surface p-1 shadow-sm" role="tablist" aria-label="Broadcast type">
                <button type="button" role="tab" aria-selected={isSent} onClick={() => setActiveTab("sent")} className={`inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold transition-colors ${isSent ? "bg-accent text-surface shadow-sm" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`}><Radio className="size-4" />Sent broadcasts <span className={`grid min-w-5 place-items-center rounded-full px-1 text-xs ${isSent ? "bg-surface/20 text-surface" : "bg-surface-muted text-ink-muted"}`}>{created.length}</span></button>
                <button type="button" role="tab" aria-selected={!isSent} onClick={() => setActiveTab("received")} className={`inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold transition-colors ${!isSent ? "bg-accent text-surface shadow-sm" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`}><Inbox className="size-4" />Received <span className={`grid min-w-5 place-items-center rounded-full px-1 text-xs ${!isSent ? "bg-surface/20 text-surface" : "bg-surface-muted text-ink-muted"}`}>{received.length}</span></button>
            </div>
            <section>
                <div className="mb-5 flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-md bg-accent-subtle text-accent">{isSent ? <Radio className="size-5" /> : <Inbox className="size-5" />}</span>
                    <div><h2 className="font-semibold text-ink">{isSent ? "Your broadcasts" : "Received invitations"}</h2><p className="text-sm text-ink-muted">{isSent ? "Track participation and current status for plans you created." : "Plans shared with your interests nearby."}</p></div>
                </div>
                {broadcasts.length ? <div className="grid gap-4 lg:grid-cols-2">{broadcasts.map((broadcast) => <BroadcastStatusCard key={broadcast._id} broadcast={broadcast} created={isSent} onRespond={isSent ? undefined : respond} responding={respondingId === broadcast._id} />)}</div> : <EmptyState icon={isSent ? <Radio className="size-5" /> : <Inbox className="size-5" />} title={isSent ? "You have not published a broadcast" : "No invitations right now"}>{isSent ? "Create one when you are ready to bring people together." : "New invitations will appear here as they arrive."}</EmptyState>}
            </section>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
    );
}