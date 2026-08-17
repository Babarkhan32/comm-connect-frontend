"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Ban, CalendarDays, ShieldCheck, Star, UserRound } from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import { Button, Card } from "./ui";

export function UserProfileWorkspace() {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [status, setStatus] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "CLOSED">("ALL");
    const [blocked, setBlocked] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => { const query = status === "ALL" ? "" : `?status=${status}`; api<UserProfile>(`/users/${id}/profile${query}`).then(setProfile).catch((reason: Error) => setError(reason.message)); }, [id, status]);
    async function toggleBlock() { try { await api(`/users/${id}/block`, { method: blocked ? "DELETE" : "POST" }); setBlocked(!blocked); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update block status."); } }
    if (error) return <p role="alert" className="text-sm text-danger">{error}</p>;
    if (!profile) return <div className="h-72 animate-pulse bg-surface-muted" />;
    const { user } = profile;
    return <div className="grid max-w-4xl gap-6">
        <Card className="flex flex-wrap items-center justify-between gap-5 p-6"><div className="flex items-center gap-4"><span className="grid size-16 place-items-center rounded-full bg-accent-subtle text-accent"><UserRound className="size-8" /></span><div><h2 className="text-2xl font-bold text-ink">{user.firstName} {user.lastName}</h2><div className="mt-2 flex items-center gap-2 text-sm text-ink-muted"><Star className="size-4 fill-warning text-warning" />{profile.rating.average ? profile.rating.average.toFixed(1) : "No ratings yet"} {profile.rating.count ? `(${profile.rating.count})` : ""}</div></div></div><Button onClick={() => void toggleBlock()} className={blocked ? "bg-success hover:bg-success" : "bg-danger hover:bg-danger"}>{blocked ? <ShieldCheck className="size-4" /> : <Ban className="size-4" />}{blocked ? "Unblock user" : "Block user"}</Button></Card>
        <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-accent" /><h3 className="text-lg font-semibold text-ink">Events attended</h3></div><div className="flex gap-1">{(["ALL", "ACTIVE", "EXPIRED", "CLOSED"] as const).map((value) => <button key={value} type="button" onClick={() => setStatus(value)} className={`border px-3 py-1.5 text-xs font-semibold ${status === value ? "border-accent bg-accent-subtle text-accent" : "border-border text-ink-muted"}`}>{value === "ALL" ? "All" : value[0] + value.slice(1).toLowerCase()}</button>)}</div></div>{profile.attendedEvents.length ? <div className="grid gap-3 sm:grid-cols-2">{profile.attendedEvents.map((event) => <Link key={event._id} href={`/broadcasts/${event._id}`}><Card className="p-4 hover:border-accent"><div className="flex items-center justify-between gap-2"><strong className="block text-sm text-ink">{event.title ?? event.message}</strong><span className="text-[10px] font-semibold text-ink-muted">{event.status}</span></div><span className="mt-1 block text-xs text-ink-muted">{new Date(event.eventDate).toLocaleDateString()} · {event.postalCode}, {event.state}</span></Card></Link>)}</div> : <Card className="p-5 text-sm text-ink-muted">No attended events in this status.</Card>}</section>
    </div>;
}
