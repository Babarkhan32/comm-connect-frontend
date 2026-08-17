"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    Ban,
    CheckCircle2,
    Clock3,
    Star,
    UserRound,
    XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { api, getList, getSession } from "@/lib/api";
import type { Broadcast, BroadcastParticipant, User } from "@/lib/types";
import { showToast } from "./toast";
import { Button, Card } from "./ui";

function participantUser(participant: BroadcastParticipant) {
    return typeof participant.userId === "string" ? null : participant.userId;
}

export function BroadcastDetailWorkspace() {
    const { id } = useParams<{ id: string }>();
    const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
    const [participants, setParticipants] = useState<BroadcastParticipant[]>([]);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    useEffect(() => {
        Promise.all([
            api<Broadcast>(`/broadcasts/${id}`),
            getList<BroadcastParticipant>(`/broadcasts/${id}/participants?limit=100`),
        ])
            .then(([result, people]) => {
                setBroadcast(result);
                setParticipants(people.data);
            })
            .catch((reason: Error) => setError(reason.message));
    }, [id]);
    async function respond(response: "accept" | "pass") {
        setBusy(response);
        try {
            await api(`/broadcasts/${id}/${response}`, { method: "PATCH" });
            setParticipants((current) =>
                current.map((item) =>
                    isCurrentUser(item)
                        ? { ...item, status: response === "accept" ? "ACCEPTED" : "PASSED" }
                        : item,
                ),
            );
            showToast(
                response === "accept" ? "Broadcast accepted." : "Invitation declined.",
                "success",
            );
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "Could not update invitation.",
            );
        } finally {
            setBusy("");
        }
    }
    async function leaveBroadcast() {
        setBusy("leave");
        try {
            const result = await api<{ participantCount?: number }>(`/broadcasts/${id}/leave`, { method: "PATCH" });
            setParticipants((current) => current.map((item) => isCurrentUser(item) ? { ...item, status: "LEFT" } : item));
            setBroadcast((current) => current ? { ...current, participantCount: typeof result.participantCount === "number" ? result.participantCount : Math.max(0, current.participantCount - 1), status: current.status === "FULL" ? "ACTIVE" : current.status } : current);
            showToast("You left this broadcast.", "success");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not leave the broadcast.");
        } finally {
            setBusy("");
        }
    }
    async function exclude(userId: string) {
        const recipient = participants.find((item) => userIdOf(item) === userId);
        const recipientId = recipient?._id ?? userId;
        setBusy(recipientId);
        try {
            await api(`/broadcasts/${id}/participants/${recipientId}/exclude`, {
                method: "PATCH",
            });
            setParticipants((current) =>
                current.map((item) =>
                    userIdOf(item) === userId ? { ...item, status: "EXCLUDED" } : item,
                ),
            );
            setBroadcast((current) =>
                current
                    ? {
                        ...current,
                        participantCount: Math.max(0, current.participantCount - 1),
                        status: current.status === "FULL" ? "ACTIVE" : current.status,
                    }
                    : current,
            );
            showToast("Participant excluded from the broadcast.", "success");
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "Could not exclude participant.",
            );
        } finally {
            setBusy("");
        }
    }
    async function rate(userId: string) {
        const value = window.prompt("Rate this participant from 1 to 5");
        const score = Number(value);
        if (!Number.isInteger(score) || score < 1 || score > 5) return;
        try {
            await api(`/broadcasts/${id}/ratings/${userId}`, {
                method: "POST",
                body: JSON.stringify({ score }),
            });
            showToast("Rating saved.", "success");
        } catch (reason) {
            setError(
                reason instanceof Error ? reason.message : "Could not save rating.",
            );
        }
    }
    function userIdOf(participant: BroadcastParticipant) {
        const userId = typeof participant.userId === "string"
            ? participant.userId
            : participant.userId._id;
        return String(userId);
    }
    function isCurrentUser(participant: BroadcastParticipant) {
        return userIdOf(participant) === getSession()?.user?._id;
    }
    if (!broadcast)
        return <div className="h-72 animate-pulse bg-surface-muted" />;
    const currentUserId = getSession()?.user?._id ? String(getSession()?.user?._id) : undefined;
    const creatorId =
        typeof broadcast.creatorId === "string"
            ? broadcast.creatorId
            : broadcast.creatorId?._id;
    const isOwner = creatorId === currentUserId;
    const currentParticipant = participants.find(isCurrentUser);
    const canRespond =
        !isOwner &&
        currentParticipant?.status === "PENDING" &&
        broadcast.status === "ACTIVE";
    const counts = participants.reduce<Record<string, number>>(
        (result, item) => ({
            ...result,
            [item.status]: (result[item.status] ?? 0) + 1,
        }),
        {},
    );
    const canSeeParticipants =
        isOwner || currentParticipant?.status === "ACCEPTED";
    const canRate = broadcast.status === "EXPIRED";
    return (
        <div className="grid max-w-4xl gap-6">
            {error && (
                <p role="alert" className="text-sm text-danger">
                    {error}
                </p>
            )}
            <Card className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                            Broadcast detail
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-ink">
                            {broadcast.title ?? "Untitled broadcast"}
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
                            {broadcast.message}
                        </p>
                    </div>
                    <span className="border border-border px-3 py-1 text-xs font-semibold text-ink-muted">
                        {broadcast.status}
                    </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-6 border-t border-border pt-4 text-sm text-ink-muted">
                    <span>
                        {broadcast.participantCount} of {broadcast.maxParticipants} accepted
                    </span>
                    <span>
                        {broadcast.postalCode}, {broadcast.state}
                    </span>
                </div>
                {canRespond && (
                    <div className="mt-5 flex gap-3">
                        <Button
                            loading={busy === "accept"}
                            onClick={() => void respond("accept")}
                        >
                            <CheckCircle2 className="size-4" />
                            Accept invitation
                        </Button>
                        <Button
                            loading={busy === "pass"}
                            onClick={() => void respond("pass")}
                            className="bg-surface-muted text-ink hover:bg-surface-muted"
                        >
                            <XCircle className="size-4" />
                            Decline
                        </Button>
                    </div>
                )}
                {!isOwner && currentParticipant && !canRespond && (
                    <p className="mt-5 text-sm font-semibold text-ink-muted">
                        Your invitation status: {currentParticipant.status}
                    </p>
                )}
                {!isOwner && currentParticipant?.status === "ACCEPTED" && broadcast.status !== "EXPIRED" && (
                    <Button loading={busy === "leave"} onClick={() => void leaveBroadcast()} className="mt-5 bg-danger hover:bg-danger">
                        Leave broadcast
                    </Button>
                )}
                {canRate &&
                    !isOwner &&
                    currentParticipant?.status === "ACCEPTED" &&
                    creatorId && (
                        <Link
                            href={`/broadcasts/${id}/ratings`}
                            className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-warning"
                        >
                            <Star className="size-4" />
                            Review broadcast and attendees
                        </Link>
                    )}
                {canRate && isOwner && (
                    <Link
                        href={`/broadcasts/${id}/ratings`}
                        className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-warning"
                    >
                        <Star className="size-4" />
                        Review broadcast and attendees
                    </Link>
                )}
            </Card>
            {canSeeParticipants && (
                <Card className="p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-ink">Participants</h3>
                            <p className="mt-1 text-sm text-ink-muted">
                                {counts.ACCEPTED ?? 0} accepted · {counts.PENDING ?? 0} pending
                                · {counts.EXCLUDED ?? 0} excluded
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 divide-y divide-border">
                        {participants.map((participant) => {
                            const person = participantUser(participant);
                            if (!person) return null;
                            const canRateParticipant =
                                canRate &&
                                participant.status === "ACCEPTED" &&
                                person._id !== currentUserId;
                            return (
                                <div
                                    key={participant._id}
                                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                                >
                                    <Link
                                        href={`/users/${person._id}`}
                                        className="flex items-center gap-3 hover:text-accent"
                                    >
                                        <span className="grid size-9 place-items-center rounded-full bg-accent-subtle text-accent">
                                            <UserRound className="size-4" />
                                        </span>
                                        <span>
                                            <strong className="block text-sm">
                                                {person.firstName} {person.lastName}
                                            </strong>
                                            <span className="flex items-center gap-1 text-xs text-ink-muted">
                                                {participant.status === "ACCEPTED" ? (
                                                    <CheckCircle2 className="size-3 text-success" />
                                                ) : (
                                                    <Clock3 className="size-3" />
                                                )}
                                                {participant.status}
                                            </span>
                                        </span>
                                    </Link>
                                    {(canRateParticipant || isOwner) && (
                                        <div className="flex gap-2">
                                            {canRateParticipant && (
                                                <button
                                                    type="button"
                                                    title="Rate participant"
                                                    onClick={() => void rate(person._id)}
                                                    className="inline-flex size-9 items-center justify-center border border-border text-warning hover:border-warning"
                                                >
                                                    <Star className="size-4" />
                                                </button>
                                            )}
                                            {isOwner && participant.status === "ACCEPTED" && (
                                                <button
                                                    type="button"
                                                    title="Exclude participant"
                                                    disabled={!!busy}
                                                    onClick={() => void exclude(person._id)}
                                                    className="inline-flex size-9 items-center justify-center border border-border text-danger hover:border-danger"
                                                >
                                                    <Ban className="size-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
