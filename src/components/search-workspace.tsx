"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarSearch, Search, UserRound } from "lucide-react";
import { getList } from "@/lib/api";
import type { Broadcast, User } from "@/lib/types";
import { Button, Card, EmptyState } from "./ui";

type SearchMode = "people" | "events";

export function SearchWorkspace({ mode, showAll = false }: { mode: SearchMode; showAll?: boolean }) {
    const params = useSearchParams();
    const router = useRouter();
    const initialQuery = params.get("q") ?? "";
    const [query, setQuery] = useState(initialQuery);
    const [users, setUsers] = useState<User[]>([]);
    const [events, setEvents] = useState<Broadcast[]>([]);
    const [total, setTotal] = useState(0);
    const [searched, setSearched] = useState(Boolean(initialQuery));
    const [loading, setLoading] = useState(false);
    const fullResults = showAll || params.get("all") === "1";
    const visibleLimit = fullResults ? 20 : 5;

    async function search(nextQuery = query) {
        const normalized = nextQuery.trim();
        if (!normalized) return;
        setLoading(true);
        try {
            if (mode === "people") {
                const result = await getList<User>(`/users/search?q=${encodeURIComponent(normalized)}&limit=${visibleLimit}`);
                setUsers(result.data);
                setTotal(result.total);
            } else {
                const result = await getList<Broadcast>(`/broadcasts/search?q=${encodeURIComponent(normalized)}&limit=${visibleLimit}`);
                setEvents(result.data);
                setTotal(result.total);
            }
            setSearched(true);
            if (params.get("q") !== normalized) router.replace(`/search/${mode}?q=${encodeURIComponent(normalized)}`);
        } finally { setLoading(false); }
    }

    useEffect(() => {
        if (initialQuery) void search(initialQuery);
    }, [initialQuery, mode, fullResults]);

    const title = mode === "people" ? "People" : "Events";
    return <div className="grid gap-6">
        <div className="flex flex-wrap gap-2">
            <Link href={`/search/people${query ? `?q=${encodeURIComponent(query)}` : ""}`} className={`border px-4 py-2 text-sm font-semibold ${mode === "people" ? "border-accent bg-accent-subtle text-accent" : "border-border text-ink-muted"}`}>People</Link>
            <Link href={`/search/events${query ? `?q=${encodeURIComponent(query)}` : ""}`} className={`border px-4 py-2 text-sm font-semibold ${mode === "events" ? "border-accent bg-accent-subtle text-accent" : "border-border text-ink-muted"}`}>Events</Link>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void search(); }} className="flex max-w-2xl gap-3">
            <label className="flex min-h-11 flex-1 items-center gap-2 border border-border bg-surface px-3 text-ink-muted"><Search className="size-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none" placeholder={mode === "people" ? "Search by name or email" : "Search by title, place, or keyword"} /></label>
            <Button loading={loading} type="submit">Search</Button>
        </form>
        {searched && <section><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-ink">{title}</h2><span className="text-sm text-ink-muted">{total} found</span></div>{mode === "people" ? users.length ? <div className="grid gap-3">{users.map((user) => <Link key={user._id} href={`/users/${user._id}`}><Card className="flex items-center gap-3 p-4 transition-colors hover:border-accent"><span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-subtle text-accent">{user.photoUrl ? <img src={user.photoUrl} alt={`${user.firstName} profile`} className="size-full object-cover" /> : <UserRound className="size-5" />}</span><span><strong className="block text-sm text-ink">{user.firstName} {user.lastName}</strong><span className="text-xs text-ink-muted">View profile</span></span></Card></Link>)}</div> : <EmptyState icon={<UserRound className="size-5" />} title="No people found">Try another name.</EmptyState> : events.length ? <div className="grid gap-3">{events.map((event) => <Link key={event._id} href={`/broadcasts/${event._id}`}><Card className="flex gap-3 p-4 transition-colors hover:border-accent"><span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-accent-subtle text-accent">{event.coverImageUrl ? <img src={event.coverImageUrl} alt="Broadcast picture" className="size-full object-contain object-top" /> : <CalendarSearch className="size-5" />}</span><div className="min-w-0"><strong className="block truncate text-sm text-ink">{event.title ?? event.message}</strong><span className="mt-1 block text-xs text-ink-muted">{new Date(event.eventDate).toLocaleString()} · {event.postalCode}, {event.state}</span></div></Card></Link>)}</div> : <EmptyState icon={<CalendarSearch className="size-5" />} title="No events found">Try another place or keyword.</EmptyState>}{!fullResults && total > visibleLimit && <Link href={`/search/${mode}?q=${encodeURIComponent(query)}&all=1`} className="mt-4 inline-flex text-sm font-semibold text-accent hover:underline">View all {total} {mode}</Link>}</section>}
    </div>;
}
