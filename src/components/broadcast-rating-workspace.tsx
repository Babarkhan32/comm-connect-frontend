"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarHeart, Star, UserRound } from "lucide-react";
import { useParams } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { BroadcastRatingContext } from "@/lib/types";
import { getSession } from "@/lib/api";
import { showToast } from "./toast";
import { Button, Card } from "./ui";

function Stars({ value, onChange, disabled = false }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
    return <div className="flex gap-1" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" disabled={disabled} onClick={() => onChange(star)} aria-label={`Rate ${star} out of 5`} className="rounded p-1 text-warning transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"><Star className={`size-6 ${star <= value ? "fill-warning" : ""}`} /></button>)}</div>;
}

export function BroadcastRatingWorkspace() {
    const { id } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const recipientId = searchParams.get("recipientId");
    const [context, setContext] = useState<BroadcastRatingContext | null>(null);
    const [broadcastScore, setBroadcastScore] = useState(0);
    const [userScores, setUserScores] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState("");
    const [error, setError] = useState("");

    console.log("Search params:", searchParams.toString(), "recipientId:", recipientId);
    useEffect(() => {
        const query = recipientId ? `?recipientId=${encodeURIComponent(recipientId)}` : "";
        api<BroadcastRatingContext>(`/broadcasts/${id}/ratings${query}`).then((result) => {
            console.log("Broadcast rating context:", result);
            setContext(result);
            setBroadcastScore(result.broadcastRating?.score ?? 0);
            setUserScores(Object.fromEntries(result.ratings.filter((rating) => rating.ratedUserId).map((rating) => [rating.ratedUserId, rating.score])));
        }).catch((reason: Error) => setError(reason.message));
    }, [id, searchParams]);

    async function saveBroadcast(score: number) {
        setBroadcastScore(score); setSaving("broadcast");
        try { await api(`/broadcasts/${id}/rating${recipientId ? `?recipientId=${encodeURIComponent(recipientId)}` : ""}`, { method: "POST", body: JSON.stringify({ score }) }); showToast("Broadcast rating saved.", "success"); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save broadcast rating."); }
        finally { setSaving(""); }
    }

    async function saveUser(userId: string, score: number) {
        setUserScores((current) => ({ ...current, [userId]: score })); setSaving(userId);
        try { await api(`/broadcasts/${id}/ratings/${userId}${recipientId ? `?recipientId=${encodeURIComponent(recipientId)}` : ""}`, { method: "POST", body: JSON.stringify({ score }) }); showToast("Participant rating saved.", "success"); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save participant rating."); }
        finally { setSaving(""); }
    }

    if (error) return <div className="grid gap-4"><Link href={`/broadcasts/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-accent"><ArrowLeft className="size-4" />Back to broadcast</Link><p role="alert" className="text-sm text-danger">{error}</p></div>;
    if (!context) return <div className="h-72 animate-pulse bg-surface-muted" />;
    const currentUserId = getSession()?.user?._id;
    const creatorId = typeof context.broadcast.creatorId === "string" ? context.broadcast.creatorId : context.broadcast.creatorId?._id;
    const isCreator = creatorId === currentUserId;
    return <div className="grid max-w-3xl gap-6">
        <Link href={`/broadcasts/${id}`} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-accent"><ArrowLeft className="size-4" />Back to broadcast</Link>
        {!isCreator && <Card className="p-6"><div className="flex items-start gap-3"><CalendarHeart className="mt-1 size-6 text-accent" /><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">Post-event review</p><h2 className="mt-1 text-2xl font-bold text-ink">{context.broadcast.title ?? context.broadcast.message}</h2><p className="mt-2 text-sm text-ink-muted">How was this broadcast?</p><div className="mt-3"><Stars value={broadcastScore} onChange={(score) => void saveBroadcast(score)} disabled={saving === "broadcast"} /></div></div></div></Card>}
        <section><div className="mb-3"><h3 className="text-lg font-semibold text-ink">People you attended with</h3><p className="mt-1 text-sm text-ink-muted">Rate the accepted participants from this broadcast.</p></div>{context.participants.length ? <div className="grid gap-3">{context.participants.map((participant) => { const person = participant.userId; return <Card key={participant._id} className="flex flex-wrap items-center justify-between gap-4 p-4"><Link href={`/users/${person._id}`} className="flex items-center gap-3 hover:text-accent"><span className="grid size-10 place-items-center rounded-full bg-accent-subtle text-accent"><UserRound className="size-5" /></span><span><strong className="block text-sm text-ink">{person.firstName} {person.lastName}</strong><span className="text-xs text-ink-muted">Open profile</span></span></Link><Stars value={userScores[person._id] ?? 0} onChange={(score) => void saveUser(person._id, score)} disabled={saving === person._id} /></Card>; })}</div> : <Card className="p-5 text-sm text-ink-muted">There are no other accepted participants to review.</Card>}</section>
    </div>;
}
