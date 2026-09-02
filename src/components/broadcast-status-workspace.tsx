"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Inbox, Radio } from "lucide-react";

import { api, getList } from "@/lib/api";
import type { Broadcast } from "@/lib/types";
import { showToast } from "./toast";
import { Card, EmptyState } from "./ui";

/* ============================================================
   HELPERS
   ============================================================ */

function formatEventDate(value: unknown) {
    const date = new Date(
        typeof value === "string" || typeof value === "number"
            ? value
            : ""
    );

    if (Number.isNaN(date.getTime())) {
        return "Date to be confirmed";
    }

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

/* ============================================================
   BROADCAST STATUS CARD
   ============================================================ */

function BroadcastStatusCard({
    broadcast,
    created,
    onRespond,
    responding,
}: {
    broadcast: Broadcast;
    created: boolean;
    onRespond?: (
        id: string,
        response: "accept" | "pass"
    ) => void;
    responding?: boolean;
}) {
    const router = useRouter();

    const date = formatEventDate(broadcast.eventDate);

    const eventTime = new Date(
        broadcast.eventDate
    ).getTime();

    const isExpired =
        broadcast.status === "EXPIRED" ||
        (!Number.isNaN(eventTime) &&
            eventTime <= Date.now());

    const displayStatus = isExpired
        ? "EXPIRED"
        : created
            ? broadcast.status
            : broadcast.recipientStatus ?? "PENDING";

    const maxParticipants = Math.max(
        Number(broadcast.maxParticipants) || 0,
        1
    );

    const participantCount = Math.max(
        Number(broadcast.participantCount) || 0,
        0
    );

    const participantPercent = Math.min(
        (participantCount / maxParticipants) * 100,
        100
    );

    const isActive =
        displayStatus === "ACTIVE" ||
        displayStatus === "PENDING";

    /* ========================================================
       CARD CONTENT
       ======================================================== */

    const cardContent = (
        <>
            {broadcast.coverImageUrl && (
                <div className="mb-4 h-40 w-full overflow-hidden rounded-md bg-surface-muted">
                    <img
                        src={broadcast.coverImageUrl}
                        alt="Broadcast picture"
                        className="size-full object-contain object-top"
                    />
                </div>
            )}

            {/* Theme accent stripe */}
            <div
                className={`absolute inset-y-0 left-0 w-1 ${isActive
                        ? "bg-accent"
                        : "bg-border"
                    }`}
            />

            <div className="pl-2">
                {/* ==================================================
                    TITLE + STATUS
                   ================================================== */}

                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                            {created
                                ? "Your broadcast"
                                : "Invitation"}
                        </p>

                        <h3 className="mt-2 text-base font-semibold leading-6 text-ink">
                            {broadcast.message}
                        </h3>
                    </div>

                    <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${isActive
                                ? "border-accent/30 bg-accent-subtle text-accent"
                                : "border-border bg-surface-muted text-ink-muted"
                            }`}
                    >
                        {displayStatus}
                    </span>
                </div>

                {/* ==================================================
                    DATE
                   ================================================== */}

                <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
                    <span className="grid size-7 place-items-center rounded-md bg-accent-subtle text-accent">
                        <CalendarDays className="size-3.5" />
                    </span>

                    {date} · {broadcast.postalCode}
                </p>

                {/* ==================================================
                    ACCEPT / DECLINE
                   ================================================== */}

                {!created &&
                    displayStatus === "PENDING" &&
                    onRespond && (
                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                disabled={responding}
                                onClick={(event) => {
                                    event.stopPropagation();

                                    onRespond(
                                        broadcast._id,
                                        "accept"
                                    );
                                }}
                                className="h-9 rounded-md bg-accent px-3 text-sm font-semibold text-surface transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {responding
                                    ? "Saving..."
                                    : "Accept"}
                            </button>

                            <button
                                type="button"
                                disabled={responding}
                                onClick={(event) => {
                                    event.stopPropagation();

                                    onRespond(
                                        broadcast._id,
                                        "pass"
                                    );
                                }}
                                className="h-9 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Decline
                            </button>
                        </div>
                    )}

                {/* ==================================================
                    PARTICIPATION
                   ================================================== */}

                <div className="mt-5 border-t border-border pt-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-ink-muted">
                            Participation
                        </span>

                        <span className="text-ink">
                            {participantCount}{" "}
                            <span className="font-normal text-ink-muted">
                                of {maxParticipants}
                            </span>
                        </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                        <div
                            className="h-full rounded-full bg-accent transition-[width] duration-500"
                            style={{
                                width: `${participantPercent}%`,
                            }}
                        />
                    </div>
                </div>
            </div>
        </>
    );

    /* ========================================================
       TARGET
       ======================================================== */

    const targetHref =
        !created &&
            displayStatus === "EXPIRED" &&
            broadcast.recipientStatus === "ACCEPTED"
            ? `/broadcasts/${broadcast._id}/ratings?recipientId=${encodeURIComponent(
                broadcast.recipientId ?? ""
            )}`
            : `/broadcasts/${broadcast._id}`;

    /* ========================================================
       CLICKABLE CARD
       ======================================================== */

    if (created || displayStatus !== "PENDING") {
        return (
            <Card
                as={Link}
                href={targetHref}
                interactive
                className="group relative block overflow-hidden border-accent/10 p-5 transition-colors hover:border-accent/30"
            >
                {cardContent}
            </Card>
        );
    }

    return (
        <Card
            as="article"
            interactive
            className="group relative cursor-pointer overflow-hidden border-accent/10 p-5 transition-colors hover:border-accent/30"
            onClick={() => router.push(targetHref)}
            onKeyDown={(event) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    router.push(targetHref);
                }
            }}
            role="link"
            tabIndex={0}
        >
            {cardContent}
        </Card>
    );
}

/* ============================================================
   BROADCAST STATUS WORKSPACE
   ============================================================ */

export function BroadcastStatusWorkspace() {
    const searchParams = useSearchParams();

    /* ========================================================
       SENT
       ======================================================== */

    const [created, setCreated] =
        useState<Broadcast[] | null>(null);

    const [sentPage, setSentPage] = useState(1);
    const [sentPages, setSentPages] = useState(1);
    const [sentTotal, setSentTotal] = useState(0);

    const [sentFilter, setSentFilter] =
        useState<
            "ALL" | Broadcast["status"]
        >("ALL");

    const [sentSort, setSentSort] =
        useState<
            | "newest"
            | "oldest"
            | "eventSoon"
            | "eventLate"
        >("newest");

    const [sentSearch, setSentSearch] =
        useState("");

    const [sentQuery, setSentQuery] =
        useState("");

    /* ========================================================
       RECEIVED
       ======================================================== */

    const [received, setReceived] =
        useState<Broadcast[] | null>(null);

    const [receivedPage, setReceivedPage] =
        useState(1);

    const [receivedPages, setReceivedPages] =
        useState(1);

    const [receivedFilter, setReceivedFilter] =
        useState<
            "ALL" | Broadcast["recipientStatus"]
        >("ALL");

    const [receivedSort, setReceivedSort] =
        useState<
            | "newest"
            | "oldest"
            | "eventSoon"
            | "eventLate"
        >("newest");

    const [receivedSearch, setReceivedSearch] =
        useState("");

    const [receivedQuery, setReceivedQuery] =
        useState("");

    /* ========================================================
       UI STATE
       ======================================================== */

    const [activeTab, setActiveTab] =
        useState<"sent" | "received">(
            searchParams.get("tab") === "received"
                ? "received"
                : "sent"
        );

    const [respondingId, setRespondingId] =
        useState<string | null>(null);

    const [error, setError] = useState("");

    /* ========================================================
       LOAD SENT BROADCASTS
       ======================================================== */

    useEffect(() => {
        const status =
            sentFilter === "ALL"
                ? ""
                : `&status=${sentFilter}`;

        const query = sentQuery.trim()
            ? `&q=${encodeURIComponent(
                sentQuery.trim()
            )}`
            : "";

        getList<Broadcast>(
            `/broadcasts/me/created?page=${sentPage}&limit=10${status}&sort=${sentSort}${query}`
        )
            .then((result) => {
                setCreated(result.data ?? []);
                setSentPages(
                    Math.max(result.pages, 1)
                );
                setSentTotal(result.total);
            })
            .catch((reason: Error) => {
                setError(reason.message);
                setCreated([]);
            });
    }, [
        sentPage,
        sentFilter,
        sentSort,
        sentQuery,
    ]);

    /* ========================================================
       LOAD RECEIVED BROADCASTS
       ======================================================== */

    useEffect(() => {
        const status =
            receivedFilter === "ALL"
                ? ""
                : `&status=${receivedFilter}`;

        const query = receivedQuery.trim()
            ? `&q=${encodeURIComponent(
                receivedQuery.trim()
            )}`
            : "";

        getList<Broadcast>(
            `/broadcasts/me/received?page=${receivedPage}&limit=10${status}&sort=${receivedSort}${query}`
        )
            .then((result) => {
                setReceived(result.data ?? []);
                setReceivedPages(
                    Math.max(result.pages, 1)
                );
            })
            .catch((reason: Error) => {
                setError(reason.message);
                setReceived([]);
            });
    }, [
        receivedPage,
        receivedFilter,
        receivedSort,
        receivedQuery,
    ]);

    /* ========================================================
       URL TAB
       ======================================================== */

    useEffect(() => {
        setActiveTab(
            searchParams.get("tab") === "received"
                ? "received"
                : "sent"
        );
    }, [searchParams]);

    /* ========================================================
       LOADING
       ======================================================== */

    if (
        created === null ||
        received === null
    ) {
        return (
            <div className="h-80 animate-pulse bg-surface-muted" />
        );
    }

    /* ========================================================
       RESPOND
       ======================================================== */

    async function respond(
        id: string,
        response: "accept" | "pass"
    ) {
        setRespondingId(id);
        setError("");

        try {
            const result =
                await api<{
                    participantCount?: number;
                }>(
                    `/broadcasts/${id}/${response}`,
                    {
                        method: "PATCH",
                    }
                );

            setReceived(
                (current) =>
                    current?.map(
                        (broadcast) =>
                            broadcast._id === id
                                ? {
                                    ...broadcast,
                                    recipientStatus:
                                        response ===
                                            "accept"
                                            ? "ACCEPTED"
                                            : "PASSED",
                                    participantCount:
                                        response ===
                                            "accept" &&
                                            typeof result.participantCount ===
                                            "number"
                                            ? result.participantCount
                                            : broadcast.participantCount,
                                }
                                : broadcast
                    ) ?? []
            );

            showToast(
                response === "accept"
                    ? "Broadcast accepted. You can now coordinate in chat."
                    : "Invitation declined.",
                "success"
            );
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "Could not update the invitation."
            );
        } finally {
            setRespondingId(null);
        }
    }

    /* ========================================================
       FILTER HELPERS
       ======================================================== */

    function updateReceivedFilter(
        value: typeof receivedFilter
    ) {
        setReceivedFilter(value);
        setReceivedPage(1);
    }

    function updateReceivedSort(
        value: typeof receivedSort
    ) {
        setReceivedSort(value);
        setReceivedPage(1);
    }

    function updateSentFilter(
        value: typeof sentFilter
    ) {
        setSentFilter(value);
        setSentPage(1);
    }

    function updateSentSort(
        value: typeof sentSort
    ) {
        setSentSort(value);
        setSentPage(1);
    }

    /* ========================================================
       ACTIVE DATA
       ======================================================== */

    const isSent = activeTab === "sent";

    const broadcasts = isSent
        ? created
        : received;

    /* ========================================================
       RENDER
       ======================================================== */

    return (
        <div className="grid gap-6">

            {/* ==================================================
                TABS
               ================================================== */}

            <div
                className="inline-flex max-w-full overflow-x-auto rounded-md border border-accent/15 bg-accent-subtle/20 p-1 shadow-sm"
                role="tablist"
                aria-label="Broadcast type"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={isSent}
                    onClick={() =>
                        setActiveTab("sent")
                    }
                    className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors ${isSent
                            ? "bg-accent text-surface shadow-sm"
                            : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                        }`}
                >
                    <Radio className="size-4" />

                    Sent broadcasts

                    <span
                        className={`grid min-w-5 place-items-center rounded-full px-1 text-xs ${isSent
                                ? "bg-surface/20 text-surface"
                                : "bg-surface-muted text-ink-muted"
                            }`}
                    >
                        {sentTotal}
                    </span>
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={!isSent}
                    onClick={() =>
                        setActiveTab("received")
                    }
                    className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors ${!isSent
                            ? "bg-accent text-surface shadow-sm"
                            : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                        }`}
                >
                    <Inbox className="size-4" />

                    Received

                    <span
                        className={`grid min-w-5 place-items-center rounded-full px-1 text-xs ${!isSent
                                ? "bg-surface/20 text-surface"
                                : "bg-surface-muted text-ink-muted"
                            }`}
                    >
                        {received.length}
                    </span>
                </button>
            </div>

            {/* ==================================================
                SECTION
               ================================================== */}

            <section>
                <div className="mb-5 flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-md bg-accent-subtle text-accent">
                        {isSent ? (
                            <Radio className="size-5" />
                        ) : (
                            <Inbox className="size-5" />
                        )}
                    </span>

                    <div>
                        <h2 className="font-semibold text-ink">
                            {isSent
                                ? "Your broadcasts"
                                : "Received invitations"}
                        </h2>

                        <p className="text-sm text-ink-muted">
                            {isSent
                                ? "Track participation and current status for plans you created."
                                : "Plans shared with your interests nearby."}
                        </p>
                    </div>
                </div>

                {/* ==================================================
                    FILTERS
                   ================================================== */}

                <div className="mb-5 flex flex-wrap items-end gap-3 rounded-md border border-accent/15 bg-accent-subtle/20 p-3">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (isSent) {
                                setSentQuery(
                                    sentSearch
                                );
                                setSentPage(1);
                            } else {
                                setReceivedQuery(
                                    receivedSearch
                                );
                                setReceivedPage(1);
                            }
                        }}
                        className="flex min-w-0 w-full flex-1 gap-2 sm:min-w-64"
                    >
                        <input
                            value={
                                isSent
                                    ? sentSearch
                                    : receivedSearch
                            }
                            onChange={(event) =>
                                isSent
                                    ? setSentSearch(
                                        event.target.value
                                    )
                                    : setReceivedSearch(
                                        event.target.value
                                    )
                            }
                            placeholder={
                                isSent
                                    ? "Search your broadcasts"
                                    : "Search received broadcasts"
                            }
                            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-sm text-ink outline-none transition-colors focus:border-accent"
                        />

                        <button
                            type="submit"
                            className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-ink-muted transition-colors hover:border-accent hover:text-accent"
                        >
                            Search
                        </button>
                    </form>

                    <label className="grid gap-1 text-xs font-semibold text-ink-muted">
                        Status

                        <select
                            value={
                                isSent
                                    ? sentFilter
                                    : receivedFilter
                            }
                            onChange={(event) =>
                                isSent
                                    ? updateSentFilter(
                                        event.target.value as typeof sentFilter
                                    )
                                    : updateReceivedFilter(
                                        event.target.value as typeof receivedFilter
                                    )
                            }
                            className="h-9 rounded-md border border-border bg-surface px-2 text-sm font-normal text-ink outline-none transition-colors focus:border-accent"
                        >
                            <option value="ALL">
                                All statuses
                            </option>

                            {isSent ? (
                                <>
                                    <option value="ACTIVE">
                                        Active
                                    </option>
                                    <option value="FULL">
                                        Full
                                    </option>
                                    <option value="EXPIRED">
                                        Expired
                                    </option>
                                    <option value="CLOSED">
                                        Closed
                                    </option>
                                    <option value="CANCELLED">
                                        Cancelled
                                    </option>
                                </>
                            ) : (
                                <>
                                    <option value="PENDING">
                                        Pending
                                    </option>
                                    <option value="ACCEPTED">
                                        Accepted
                                    </option>
                                    <option value="PASSED">
                                        Passed
                                    </option>
                                    <option value="LEFT">
                                        Left
                                    </option>
                                    <option value="REMOVED">
                                        Removed
                                    </option>
                                    <option value="EXPIRED">
                                        Expired
                                    </option>
                                </>
                            )}
                        </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-ink-muted">
                        Sort by

                        <select
                            value={
                                isSent
                                    ? sentSort
                                    : receivedSort
                            }
                            onChange={(event) =>
                                isSent
                                    ? updateSentSort(
                                        event.target.value as typeof sentSort
                                    )
                                    : updateReceivedSort(
                                        event.target.value as typeof receivedSort
                                    )
                            }
                            className="h-9 rounded-md border border-border bg-surface px-2 text-sm font-normal text-ink outline-none transition-colors focus:border-accent"
                        >
                            <option value="newest">
                                Newest
                            </option>
                            <option value="oldest">
                                Oldest
                            </option>
                            <option value="eventSoon">
                                Event date soonest
                            </option>
                            <option value="eventLate">
                                Event date latest
                            </option>
                        </select>
                    </label>
                </div>

                {/* ==================================================
                    BROADCAST GRID
                   ================================================== */}

                {broadcasts.length ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {broadcasts.map(
                            (broadcast) => (
                                <BroadcastStatusCard
                                    key={broadcast._id}
                                    broadcast={broadcast}
                                    created={isSent}
                                    onRespond={
                                        isSent
                                            ? undefined
                                            : respond
                                    }
                                    responding={
                                        respondingId ===
                                        broadcast._id
                                    }
                                />
                            )
                        )}
                    </div>
                ) : (
                    <EmptyState
                        icon={
                            isSent ? (
                                <Radio className="size-5" />
                            ) : (
                                <Inbox className="size-5" />
                            )
                        }
                        title={
                            isSent
                                ? "You have not published a broadcast"
                                : "No invitations right now"
                        }
                    >
                        {isSent
                            ? "Create one when you are ready to bring people together."
                            : "New invitations will appear here as they arrive."}
                    </EmptyState>
                )}

                {/* ==================================================
                    PAGINATION
                   ================================================== */}

                {(isSent
                    ? sentPages
                    : receivedPages) > 1 && (
                        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                            <button
                                type="button"
                                disabled={
                                    (isSent
                                        ? sentPage
                                        : receivedPage) === 1
                                }
                                onClick={() =>
                                    isSent
                                        ? setSentPage(
                                            (page) =>
                                                Math.max(
                                                    1,
                                                    page - 1
                                                )
                                        )
                                        : setReceivedPage(
                                            (page) =>
                                                Math.max(
                                                    1,
                                                    page - 1
                                                )
                                        )
                                }
                                className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                            >
                                Previous
                            </button>

                            <span className="text-sm text-ink-muted">
                                Page{" "}
                                {isSent
                                    ? sentPage
                                    : receivedPage}{" "}
                                of{" "}
                                {isSent
                                    ? sentPages
                                    : receivedPages}
                            </span>

                            <button
                                type="button"
                                disabled={
                                    (isSent
                                        ? sentPage
                                        : receivedPage) ===
                                    (isSent
                                        ? sentPages
                                        : receivedPages)
                                }
                                onClick={() =>
                                    isSent
                                        ? setSentPage(
                                            (page) =>
                                                Math.min(
                                                    sentPages,
                                                    page + 1
                                                )
                                        )
                                        : setReceivedPage(
                                            (page) =>
                                                Math.min(
                                                    receivedPages,
                                                    page + 1
                                                )
                                        )
                                }
                                className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    )}
            </section>

            {/* ==================================================
                ERROR
               ================================================== */}

            {error && (
                <p
                    role="alert"
                    className="text-sm text-danger"
                >
                    {error}
                </p>
            )}
        </div>
    );
}