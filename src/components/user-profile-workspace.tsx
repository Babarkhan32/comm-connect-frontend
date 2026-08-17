"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Ban, CalendarDays, ShieldCheck, Star, UserRound } from "lucide-react";
import { useParams } from "next/navigation";
import { api, getSession } from "@/lib/api";
import type { Broadcast, ProfileEventsPage, UserProfile } from "@/lib/types";
import { Button, Card } from "./ui";

export function UserProfileWorkspace() {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [status, setStatus] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "CLOSED">("ALL");
    const [eventType, setEventType] = useState<"attended" | "created">("attended");
    const [events, setEvents] = useState<Broadcast[]>([]);
    const [eventPage, setEventPage] = useState(1);
    const [eventPages, setEventPages] = useState(1);
    const [eventsLoading, setEventsLoading] = useState(false);
    const eventSentinelRef = useRef<HTMLDivElement | null>(null);
    const [blocked, setBlocked] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        const refreshProfile = () => api<UserProfile>(`/users/${id}/profile`).then(setProfile).catch((reason: Error) => setError(reason.message));
        void refreshProfile();
        const timer = window.setInterval(() => void refreshProfile(), 14 * 60 * 1000);
        return () => window.clearInterval(timer);
    }, [id]);
    useEffect(() => {
        const statusQuery = status === "ALL" ? "" : `&status=${status}`;
        setEventsLoading(true);
        api<ProfileEventsPage>(`/users/${id}/profile/events?type=${eventType}&page=${eventPage}&limit=12${statusQuery}`)
            .then((result) => { setEvents((current) => eventPage === 1 ? result.data : [...current, ...result.data]); setEventPages(Math.max(result.totalPages, 1)); })
            .catch((reason: Error) => setError(reason.message))
            .finally(() => setEventsLoading(false));
    }, [id, eventType, status, eventPage]);
    useEffect(() => {
        const sentinel = eventSentinelRef.current;
        if (!sentinel || eventPage >= eventPages || eventsLoading) return;
        const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting && !eventsLoading) setEventPage((page) => Math.min(eventPages, page + 1)); }, { rootMargin: "180px" });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [eventPage, eventPages, eventsLoading]);
    async function toggleBlock() { try { await api(`/users/${id}/block`, { method: blocked ? "DELETE" : "POST" }); setBlocked(!blocked); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update block status."); } }
    if (error) return <p role="alert" className="text-sm text-danger">{error}</p>;
    if (!profile) return <div className="h-72 animate-pulse bg-surface-muted" />;
    const { user } = profile;
    const isOwnProfile = getSession()?.user?._id === user._id;
    function changeEventType(value: "attended" | "created") { setEventType(value); setEventPage(1); setEvents([]); }
    function changeStatus(value: typeof status) { setStatus(value); setEventPage(1); setEvents([]); }
    return <div className="grid max-w-4xl gap-6">
        <Card className="flex flex-wrap items-center justify-between gap-5 p-6"><div className="flex items-center gap-4"><span className="grid size-16 place-items-center overflow-hidden rounded-full bg-accent-subtle text-accent">{user.photoUrl ? <img src={user.photoUrl} alt={`${user.firstName} profile`} className="size-full object-cover" /> : <UserRound className="size-8" />}</span><div><h2 className="text-2xl font-bold text-ink">{user.firstName} {user.lastName}</h2><div className="mt-2 flex items-center gap-2 text-sm text-ink-muted"><Star className="size-4 fill-warning text-warning" />{profile.rating.average ? profile.rating.average.toFixed(1) : "No ratings yet"} {profile.rating.count ? `(${profile.rating.count})` : ""}</div></div></div>{!isOwnProfile && <Button onClick={() => void toggleBlock()} className={blocked ? "bg-success hover:bg-success" : "bg-danger hover:bg-danger"}>{blocked ? <ShieldCheck className="size-4" /> : <Ban className="size-4" />}{blocked ? "Unblock user" : "Block user"}</Button>}</Card>
        <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-accent" /><h3 className="text-lg font-semibold text-ink">Broadcast history</h3></div><div className="flex gap-1"><button type="button" onClick={() => changeEventType("attended")} className={`border px-3 py-1.5 text-xs font-semibold ${eventType === "attended" ? "border-accent bg-accent-subtle text-accent" : "border-border text-ink-muted"}`}>Attended</button><button type="button" onClick={() => changeEventType("created")} className={`border px-3 py-1.5 text-xs font-semibold ${eventType === "created" ? "border-accent bg-accent-subtle text-accent" : "border-border text-ink-muted"}`}>Created</button></div></div><div className="mb-4 flex gap-1">{(["ALL", "ACTIVE", "EXPIRED", "CLOSED"] as const).map((value) => <button key={value} type="button" onClick={() => changeStatus(value)} className={`border px-3 py-1.5 text-xs font-semibold ${status === value ? "border-accent bg-accent-subtle text-accent" : "border-border text-ink-muted"}`}>{value === "ALL" ? "All" : value[0] + value.slice(1).toLowerCase()}</button>)}</div>{events.length ? <div className="max-h-[32rem] overflow-y-auto pr-1"><div className="grid gap-3 sm:grid-cols-2">{events.map((event) => <Link key={event._id} href={`/broadcasts/${event._id}`}><Card className="overflow-hidden p-0 hover:border-accent">{event.coverImageUrl && <div className="h-28 bg-surface-muted"><img src={event.coverImageUrl} alt="Broadcast picture" className="size-full object-contain object-top" /></div>}<div className="p-4"><div className="flex items-center justify-between gap-2"><strong className="block text-sm text-ink">{event.title ?? event.message}</strong><span className="text-[10px] font-semibold text-ink-muted">{event.status}</span></div><span className="mt-1 block text-xs text-ink-muted">{new Date(event.eventDate).toLocaleDateString()} · {event.postalCode}, {event.state}</span></div></Card></Link>)}</div><div ref={eventSentinelRef} className="h-2" />{eventsLoading && <p className="py-3 text-center text-xs text-ink-muted">Loading more broadcasts...</p>}</div> : eventsLoading ? <Card className="p-5 text-sm text-ink-muted">Loading broadcasts...</Card> : <Card className="p-5 text-sm text-ink-muted">No {eventType} broadcasts in this status.</Card>}</section>
    </div>;
}
