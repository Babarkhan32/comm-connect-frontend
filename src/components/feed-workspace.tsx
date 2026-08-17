"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Heart, Image as ImageIcon, Play, Send, UserRound } from "lucide-react";
import { api, getList } from "@/lib/api";
import type { FeedBroadcast, FeedMedia } from "@/lib/types";
import { showToast } from "./toast";
import { Card } from "./ui";

type FeedKind = "upcoming" | "past";

function FeedCard({ broadcast, onLike, onApply }: { broadcast: FeedBroadcast; onLike: (media: FeedMedia) => void; onApply: () => Promise<void> }) {
    const carouselRef = useRef<HTMLDivElement | null>(null);
    const orderedMedia = [...broadcast.media.filter((item) => item.mediaType === "video"), ...broadcast.media.filter((item) => item.mediaType === "image")];
    function moveCarousel(direction: number) {
        carouselRef.current?.scrollBy({ left: direction * carouselRef.current.clientWidth, behavior: "smooth" });
    }
    const audienceLabel = broadcast.audienceGender === "MALE" ? "Men only" : broadcast.audienceGender === "FEMALE" ? "Women only" : broadcast.audienceGender === "OTHER" ? "Other gender only" : null;
    return <Card className="min-h-[calc(100dvh-12rem)] snap-start snap-always overflow-hidden bg-surface shadow-sm">
        <div className="relative bg-black">
            <div ref={carouselRef} className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none">
                {orderedMedia.map((item, index) => <div key={item.key} className="relative min-w-full snap-center"><div className="aspect-[4/3] bg-black">{item.mediaType === "video" ? <video src={item.url} controls playsInline preload="metadata" controlsList="nodownload" className="size-full object-contain" /> : <img src={item.url} alt="Broadcast media" className="size-full object-contain" />}</div><span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white">{item.mediaType === "video" ? <Play className="size-3 fill-current" /> : <ImageIcon className="size-3" />}{item.mediaType === "video" ? "Highlight" : "Photo"} · {index + 1}/{orderedMedia.length}</span><button type="button" aria-label={`Like ${item.mediaType} ${index + 1}`} onClick={() => onLike(item)} className={`absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-sm font-semibold text-white ${item.likedByUser ? "text-red-300" : ""}`}><Heart className={`size-4 ${item.likedByUser ? "fill-current" : ""}`} />{item.likeCount}</button></div>)}
            </div>
            {orderedMedia.length > 1 && <><button type="button" aria-label="Previous media" onClick={(event) => { event.preventDefault(); moveCarousel(-1); }} className="absolute left-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white">‹</button><button type="button" aria-label="Next media" onClick={(event) => { event.preventDefault(); moveCarousel(1); }} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white">›</button></>}
        </div>
        <Link href={`/broadcasts/${broadcast._id}`} className="block"><div className="p-4"><div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-full bg-accent-subtle text-accent"><UserRound className="size-4" /></span><div className="min-w-0"><h2 className="truncate text-base font-semibold text-ink">{broadcast.title ?? broadcast.message}</h2><p className="mt-1 flex items-center gap-1 text-xs text-ink-muted"><CalendarDays className="size-3.5" />{new Date(broadcast.eventDate).toLocaleString()}</p></div></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-muted">{broadcast.message}</p></div></Link>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3"><span className="text-xs text-ink-muted">{broadcast.postalCode}, {broadcast.state}</span><div className="flex flex-wrap items-center justify-end gap-2">{audienceLabel && <span className="rounded-full border border-accent/30 bg-accent-subtle px-2.5 py-1 text-xs font-semibold text-accent">{audienceLabel}</span>}{broadcast.isCreator && <span className="text-xs font-semibold text-accent">Your broadcast</span>}{broadcast.canApply && <button type="button" onClick={(event) => { event.preventDefault(); void onApply(); }} className="inline-flex items-center gap-1.5 bg-accent px-3 py-1.5 text-xs font-semibold text-surface hover:bg-accent-hover"><Send className="size-3" />Apply</button>}{broadcast.applicationStatus === "PENDING" && <span className="text-xs font-semibold text-warning">Application pending</span>}{broadcast.applicationStatus === "ACCEPTED" && <span className="text-xs font-semibold text-success">Accepted</span>}{broadcast.applicationStatus === "REJECTED" && <span className="text-xs font-semibold text-danger">Application rejected</span>}{!broadcast.canApply && !broadcast.applicationStatus && !broadcast.isCreator && broadcast.status === "FULL" && <span className="text-xs font-semibold text-ink-muted">Full</span>}</div></div>
    </Card>;
}

export function FeedWorkspace() {
    const [kind, setKind] = useState<FeedKind>("upcoming");
    const [items, setItems] = useState<FeedBroadcast[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setLoading(true);
        getList<FeedBroadcast>(`/broadcasts/feed?kind=${kind}&page=${page}&limit=8`)
            .then((result) => { setItems((current) => page === 1 ? result.data : [...current, ...result.data]); setPages(Math.max(result.pages, 1)); })
            .catch((reason: Error) => setError(reason.message))
            .finally(() => setLoading(false));
    }, [kind, page]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || loading || page >= pages) return;
        const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) setPage((current) => Math.min(pages, current + 1)); }, { rootMargin: "240px" });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loading, page, pages]);

    async function toggleLike(broadcast: FeedBroadcast, media: FeedMedia) {
        const nextLiked = !media.likedByUser;
        setItems((current) => current.map((item) => item._id !== broadcast._id ? item : { ...item, media: item.media.map((entry) => entry.key === media.key ? { ...entry, likedByUser: nextLiked, likeCount: entry.likeCount + (nextLiked ? 1 : -1) } : entry) }));
        try { await api(`/broadcasts/${broadcast._id}/media-like`, { method: nextLiked ? "POST" : "DELETE", body: JSON.stringify({ mediaKey: media.key, mediaType: media.mediaType }) }); }
        catch (reason) { setItems((current) => current.map((item) => item._id !== broadcast._id ? item : { ...item, media: item.media.map((entry) => entry.key === media.key ? media : entry) })); showToast(reason instanceof Error ? reason.message : "Could not update like.", "error"); }
    }

    async function apply(broadcast: FeedBroadcast) {
        try {
            await api(`/broadcasts/${broadcast._id}/apply`, { method: "POST" });
            setItems((current) => current.map((item) => item._id === broadcast._id ? { ...item, canApply: false, applicationStatus: "PENDING" } : item));
            showToast("Application sent to the creator.", "success");
        } catch (reason) { showToast(reason instanceof Error ? reason.message : "Could not apply to this broadcast.", "error"); }
    }

    function switchKind(next: FeedKind) { setKind(next); setPage(1); setPages(1); setItems([]); setError(""); }
    return <div className="feed-page mx-auto grid max-w-2xl snap-y snap-mandatory gap-5">
        <div className="flex border border-border bg-surface p-1"><button type="button" onClick={() => switchKind("upcoming")} className={`flex-1 py-2 text-sm font-semibold ${kind === "upcoming" ? "bg-accent text-surface" : "text-ink-muted"}`}>Upcoming events</button><button type="button" onClick={() => switchKind("past")} className={`flex-1 py-2 text-sm font-semibold ${kind === "past" ? "bg-accent text-surface" : "text-ink-muted"}`}>Past highlights</button></div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {items.map((broadcast) => <FeedCard key={broadcast._id} broadcast={broadcast} onLike={(selected) => void toggleLike(broadcast, selected)} onApply={() => apply(broadcast)} />)}
        <div ref={sentinelRef} className="h-2 snap-end" />
        {!items.length && !loading && !error && <Card className="p-8 text-center text-sm text-ink-muted">No media in this feed yet.</Card>}
        {loading && <p className="py-4 text-center text-xs text-ink-muted">Loading more highlights...</p>}
    </div>;
}
