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
    const [applications, setApplications] = useState<BroadcastParticipant[]>([]);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState("");
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editMessage, setEditMessage] = useState("");
    const [editEventDate, setEditEventDate] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    useEffect(() => {
        const urls = imageFiles.map((file) => URL.createObjectURL(file));
        setImagePreviews(urls);
        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [imageFiles]);
    useEffect(() => {
        if (!videoFile) { setVideoPreview(""); return; }
        const url = URL.createObjectURL(videoFile);
        setVideoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [videoFile]);
    useEffect(() => {
        async function loadBroadcast() {
            const result = await api<Broadcast>(`/broadcasts/${id}`);
            const currentUserId = getSession()?.user?._id;
            const creatorId = typeof result.creatorId === "string" ? result.creatorId : result.creatorId?._id;
            const applicationsRequest = creatorId && creatorId === currentUserId
                ? api<BroadcastParticipant[]>(`/broadcasts/${id}/applications`)
                : Promise.resolve<BroadcastParticipant[]>([]);
            const [people, applicationsResult, media] = await Promise.all([
                getList<BroadcastParticipant>(`/broadcasts/${id}/participants?limit=100`),
                applicationsRequest,
                api<{ imageUrls: string[]; imageMedia: { key: string; url: string }[]; coverImageUrl: string | null; highlightVideoUrl: string | null; introVideoUrl: string | null }>(`/broadcasts/${id}/images`).catch(() => null),
            ]);
            setBroadcast({ ...result, ...(media ? { imageUrls: media.imageUrls, imageMedia: media.imageMedia, coverImageUrl: media.coverImageUrl, highlightVideoUrl: media.highlightVideoUrl, introVideoUrl: media.introVideoUrl } : {}) });
            setEditTitle(result.title ?? "");
            setEditMessage(result.message ?? "");
            setEditEventDate(result.eventDate ? new Date(result.eventDate).toISOString().slice(0, 16) : "");
            setParticipants(people.data);
            setApplications(applicationsResult);
        }
        loadBroadcast()
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
    async function saveBroadcastEdit() {
        setSavingEdit(true);
        try {
            const updated = await api<Broadcast>(`/broadcasts/${id}`, { method: "PATCH", body: JSON.stringify({ title: editTitle, message: editMessage, eventDate: new Date(editEventDate).toISOString() }) });
            setBroadcast(updated);
            setEditing(false);
            showToast("Broadcast updated.", "success");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not update broadcast.");
        } finally { setSavingEdit(false); }
    }
    async function uploadImages() {
        if (!imageFiles.length) return;
        setUploadingImages(true);
        try {
            let updated = broadcast;
            for (const [index, file] of imageFiles.entries()) {
                const presigned = await api<{ uploadUrl: string; objectKey: string; headers: Record<string, string> }>(`/broadcasts/${id}/images/presign`, { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size }) });
                const upload = await fetch(presigned.uploadUrl, { method: "PUT", headers: presigned.headers, body: file });
                if (!upload.ok) throw new Error("Could not upload broadcast image.");
                updated = await api<Broadcast>(`/broadcasts/${id}/images`, { method: "POST", body: JSON.stringify({ objectKey: presigned.objectKey, makeCover: index === 0 && !broadcast?.coverImageUrl }) });
            }
            setBroadcast(updated);
            setImageFiles([]);
            showToast("Broadcast images uploaded.", "success");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not upload broadcast images.");
        } finally {
            setUploadingImages(false);
        }
    }
    async function deleteImage(objectKey: string) {
        setBusy(objectKey);
        try {
            const updated = await api<Broadcast>(`/broadcasts/${id}/images`, { method: "DELETE", body: JSON.stringify({ objectKey }) });
            setBroadcast(updated);
            showToast("Broadcast image deleted.", "success");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not delete broadcast image.");
        } finally {
            setBusy("");
        }
    }
    async function uploadVideo(videoKind: "intro" | "highlight" = "highlight") {
        if (!videoFile) return;
        setUploadingVideo(true);
        try {
            const presigned = await api<{ uploadUrl: string; objectKey: string; headers: Record<string, string> }>(`/broadcasts/${id}/video/presign`, { method: "POST", body: JSON.stringify({ fileName: videoFile.name, contentType: videoFile.type, fileSize: videoFile.size, videoKind }) });
            const upload = await fetch(presigned.uploadUrl, { method: "PUT", headers: presigned.headers, body: videoFile });
            if (!upload.ok) throw new Error("Could not upload highlight video.");
            const updated = await api<Broadcast>(`/broadcasts/${id}/video`, { method: "POST", body: JSON.stringify({ objectKey: presigned.objectKey, videoKind }) });
            setBroadcast(updated);
            setVideoFile(null);
            showToast("Highlight video uploaded.", "success");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not upload highlight video.");
        } finally { setUploadingVideo(false); }
    }
    async function deleteVideo(videoKind: "intro" | "highlight" = "highlight") {
        setBusy("video");
        try { setBroadcast(await api<Broadcast>(`/broadcasts/${id}/video?videoKind=${videoKind}`, { method: "DELETE" })); showToast(`${videoKind === "intro" ? "Intro" : "Highlight"} video deleted.`, "success"); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete highlight video."); }
        finally { setBusy(""); }
    }
    function removeSelectedImage(index: number) {
        setImageFiles((current) => current.filter((_, imageIndex) => imageIndex !== index));
    }
    async function exclude(userId: string) {
        const recipient = participants.find((item) => userIdOf(item) === userId) ?? applications.find((item) => userIdOf(item) === userId);
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
    async function reviewApplication(userId: string, decision: "accept" | "reject") {
        const recipient = participants.find((item) => userIdOf(item) === userId) ?? applications.find((item) => userIdOf(item) === userId);
        if (!recipient) return;
        setBusy(recipient._id);
        try {
            const updated = await api<{ participantCount?: number }>(`/broadcasts/${id}/applications/${userId}/${decision}`, { method: "PATCH" });
            setParticipants((current) => current.map((item) => item._id === recipient._id ? { ...item, status: decision === "accept" ? "ACCEPTED" : "REJECTED" } : item));
            setApplications((current) => current.map((item) => item._id === recipient._id ? { ...item, status: decision === "accept" ? "ACCEPTED" : "REJECTED" } : item));
            if (decision === "accept") setBroadcast((current) => current ? { ...current, participantCount: typeof updated.participantCount === "number" ? updated.participantCount : current.participantCount } : current);
            showToast(decision === "accept" ? "Application accepted and chat access granted." : "Application rejected.", "success");
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not review application."); }
        finally { setBusy(""); }
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
        return userIdOf(participant) === String(getSession()?.user?._id ?? "");
    }
    if (!broadcast)
        return <div className="h-72 animate-pulse bg-surface-muted" />;
    const currentUserId = getSession()?.user?._id ? String(getSession()?.user?._id) : undefined;
    const creatorId =
        typeof broadcast.creatorId === "string"
            ? broadcast.creatorId
            : broadcast.creatorId?._id;
    const creator = typeof broadcast.creatorId === "string" ? null : broadcast.creatorId;
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
    const eventHasPassed = !Number.isNaN(new Date(broadcast.eventDate).getTime()) && new Date(broadcast.eventDate).getTime() <= Date.now();
    const canUploadEventImages = !isOwner && currentParticipant?.status === "ACCEPTED" && (broadcast.status === "EXPIRED" || eventHasPassed);
    return (
        <div className="grid max-w-4xl gap-6">
            {error && (
                <p role="alert" className="text-sm text-danger">
                    {error}
                </p>
            )}
            <Card className="p-6">
                {broadcast.imageMedia?.length ? <div className="mb-6 grid gap-3 sm:grid-cols-3">{broadcast.imageMedia.map((image) => <div key={image.key} className="relative h-32 overflow-hidden rounded-md bg-surface-muted"><img src={image.url} alt="Broadcast picture" className="size-full object-contain object-top" />{(isOwner || image.key.includes(`/event/${currentUserId}/`)) && <button type="button" title="Delete image" disabled={busy === image.key} onClick={() => void deleteImage(image.key)} className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-danger text-surface shadow-sm hover:bg-danger/90 disabled:opacity-50"><XCircle className="size-4" /></button>}</div>)}</div> : broadcast.imageUrls?.length ? <div className="mb-6 grid gap-3 sm:grid-cols-3">{broadcast.imageUrls.map((imageUrl) => <div key={imageUrl} className="h-32 overflow-hidden rounded-md bg-surface-muted"><img src={imageUrl} alt="Broadcast picture" className="size-full object-contain object-top" /></div>)}</div> : null}
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
                {creator && <Link href={`/users/${creator._id}`} className="mt-5 flex w-fit items-center gap-3 border-t border-border pt-5 transition-colors hover:text-accent"><span className="grid size-10 place-items-center overflow-hidden rounded-full bg-accent-subtle text-accent">{creator.photoUrl ? <img src={creator.photoUrl} alt={`${creator.firstName} profile`} className="size-full object-cover" /> : <UserRound className="size-5" />}</span><span><span className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">Created by</span><strong className="block text-sm text-ink">{creator.firstName} {creator.lastName}</strong></span></Link>}
                {isOwner && !editing && broadcast.status !== "EXPIRED" && broadcast.status !== "CANCELLED" && <Button onClick={() => setEditing(true)} className="mt-5">Edit broadcast</Button>}
                {isOwner && editing && <div className="mt-5 grid gap-3 border-t border-border pt-5"><label className="grid gap-1 text-sm font-semibold text-ink">Title<input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={120} className="h-10 border border-border px-3 text-sm font-normal outline-none focus:border-accent" /></label><label className="grid gap-1 text-sm font-semibold text-ink">Message<textarea value={editMessage} onChange={(event) => setEditMessage(event.target.value)} maxLength={1000} rows={3} className="border border-border px-3 py-2 text-sm font-normal outline-none focus:border-accent" /></label><label className="grid gap-1 text-sm font-semibold text-ink">Event date<input type="datetime-local" value={editEventDate} onChange={(event) => setEditEventDate(event.target.value)} className="h-10 border border-border px-3 text-sm font-normal outline-none focus:border-accent" /></label><div className="flex gap-2"><Button loading={savingEdit} onClick={() => void saveBroadcastEdit()}>Save changes</Button><button type="button" onClick={() => setEditing(false)} className="border border-border px-4 text-sm font-semibold text-ink-muted">Cancel</button></div><p className="text-xs text-ink-muted">Interests cannot be changed after publishing. Accepted participants stay enrolled when the date changes.</p></div>}
                <div className="mt-6 flex flex-wrap gap-6 border-t border-border pt-4 text-sm text-ink-muted">
                    <span>
                        {broadcast.participantCount} of {broadcast.maxParticipants} accepted
                    </span>
                    {broadcast.originAddress && <span>Current address: {broadcast.originAddress}</span>}
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
                            className="!border !border-border !bg-surface-muted !text-ink hover:!bg-border"
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
                {!isOwner && currentParticipant?.status === "REMOVED" && (
                    <p className="mt-5 border border-danger/30 bg-danger/10 p-3 text-sm font-semibold text-danger">
                        The creator removed you from this broadcast. You can no longer join or access its group chat.
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
                        Review attendees
                    </Link>
                )}
                {(isOwner || canUploadEventImages) && <div className="mt-5 border-t border-border pt-5"><label className="grid gap-2 text-sm font-semibold text-ink">Add pictures
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { const selectedFiles = Array.from(event.target.files ?? []); setImageFiles((current) => [...current, ...selectedFiles]); event.currentTarget.value = ""; }} className="block w-full text-sm font-normal text-ink-muted" />
                </label>{imagePreviews.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{imagePreviews.map((preview, index) => <div key={preview} className="relative bg-surface-muted"><img src={preview} alt={`Selected event picture ${index + 1}`} className="h-24 w-full object-contain object-top" /><button type="button" title="Remove selected picture" aria-label={`Remove selected event picture ${index + 1}`} onClick={() => removeSelectedImage(index)} className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-danger text-surface shadow-sm hover:bg-danger/90"><XCircle className="size-4" /></button>{index === 0 && <span className="absolute bottom-1 left-1 rounded bg-ink/85 px-1.5 py-1 text-[10px] font-semibold text-surface">First upload</span>}</div>)}</div>}{imageFiles.length > 0 && <Button loading={uploadingImages} onClick={() => void uploadImages()} className="mt-3">Upload {imageFiles.length} image{imageFiles.length === 1 ? "" : "s"}</Button>}</div>}
                {broadcast.highlightVideoUrl && <div className="mt-5 border-t border-border pt-5"><p className="text-sm font-semibold text-ink">Highlight video</p><video controls preload="metadata" src={broadcast.highlightVideoUrl} className="mt-3 max-h-72 w-full max-w-xl rounded-md bg-black" /></div>}
                {broadcast.introVideoUrl && <div className="mt-5 border-t border-border pt-5"><p className="text-sm font-semibold text-ink">Broadcast intro video</p><video controls preload="metadata" src={broadcast.introVideoUrl} className="mt-3 max-h-72 w-full max-w-xl rounded-md bg-black" /></div>}
                {isOwner && !eventHasPassed && <div className="mt-5 border-t border-border pt-5"><p className="text-sm font-semibold text-ink">Broadcast intro video <span className="font-normal text-ink-muted">(optional)</span></p><p className="mt-1 text-sm text-ink-muted">Add one lightweight intro video to help people understand this broadcast.</p>{broadcast.introVideoUrl ? <button type="button" title="Delete intro video" onClick={() => void deleteVideo("intro")} className="mt-3 inline-flex items-center gap-2 border border-danger px-3 py-2 text-sm font-semibold text-danger hover:bg-danger hover:text-surface"><XCircle className="size-4" />Delete intro video</button> : <><label className="mt-3 inline-flex cursor-pointer items-center border border-accent bg-accent-subtle px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent hover:text-surface">Choose intro video<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { setVideoFile(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} className="sr-only" /></label>{videoPreview && <div className="relative mt-3 max-w-xl"><video controls preload="metadata" src={videoPreview} className="max-h-72 w-full rounded-md bg-black" /><Button loading={uploadingVideo} onClick={() => void uploadVideo("intro")} className="mt-3">Upload intro video</Button></div>}</>}</div>}
                {isOwner && (
                    <div className="mt-5 border-t border-border pt-5">
                        <p className="text-sm font-semibold text-ink">
                            Highlight video <span className="font-normal text-ink-muted">(optional)</span>
                        </p>
                        <p className="mt-1 text-sm text-ink-muted">
                            Add one short highlight video from this broadcast. Only the creator can upload or delete it.
                        </p>
                        {broadcast.highlightVideoUrl ? (
                            <button type="button" title="Delete highlight video" onClick={() => void deleteVideo()} className="mt-3 inline-flex items-center gap-2 border border-danger px-3 py-2 text-sm font-semibold text-danger hover:bg-danger hover:text-surface">
                                <XCircle className="size-4" />
                                Delete highlight video
                            </button>
                        ) : eventHasPassed ? (
                            <>
                                <label className="mt-3 inline-flex cursor-pointer items-center border border-accent bg-accent-subtle px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent hover:text-surface">
                                    Choose highlight video
                                    <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { setVideoFile(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} className="sr-only" />
                                </label>
                                {videoPreview && (
                                    <div className="relative mt-3 max-w-xl">
                                        <video controls preload="metadata" src={videoPreview} className="max-h-72 w-full rounded-md bg-black" />
                                        <button type="button" title="Remove selected video" onClick={() => setVideoFile(null)} className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-danger text-surface hover:bg-danger/90">
                                            <XCircle className="size-4" />
                                        </button>
                                        <Button loading={uploadingVideo} onClick={() => void uploadVideo()} className="mt-3">Upload highlight video</Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-ink-muted">Available after the event has ended.</p>
                        )}
                    </div>
                )}
            </Card>
            {isOwner && (
                <Card className="border-accent/40 p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-ink">Applications</h3>
                            <p className="mt-1 text-sm text-ink-muted">People who asked to join this broadcast.</p>
                        </div>
                        <span className="rounded-full bg-accent-subtle px-2.5 py-1 text-xs font-semibold text-accent">{applications.filter((item) => item.status === "PENDING").length} pending</span>
                    </div>
                    <div className="mt-4 divide-y divide-border">
                        {applications.length === 0 && <p className="py-3 text-sm text-ink-muted">No pending applications. New applications will appear here.</p>}
                        {applications.map((participant) => {
                            const applicant = participantUser(participant);
                            if (!applicant) return null;
                            return <div key={participant._id} className="flex flex-wrap items-center justify-between gap-3 py-3"><Link href={`/users/${applicant._id}`} className="flex items-center gap-3 hover:text-accent"><span className="grid size-9 place-items-center rounded-full bg-accent-subtle text-accent"><UserRound className="size-4" /></span><span><strong className="block text-sm font-semibold text-ink">{applicant.firstName} {applicant.lastName}</strong><span className="text-xs text-ink-muted">{participant.status}</span></span></Link>{participant.status === "PENDING" && <div className="flex gap-2"><button type="button" disabled={!!busy} onClick={() => void reviewApplication(applicant._id, "accept")} className="border border-success px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/10">Accept</button><button type="button" disabled={!!busy} onClick={() => void reviewApplication(applicant._id, "reject")} className="border border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10">Reject</button></div>}</div>;
                        })}
                    </div>
                </Card>
            )}
            {canSeeParticipants && (
                <Card className="p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-ink">Participants</h3>
                            <p className="mt-1 text-sm text-ink-muted">
                                {counts.ACCEPTED ?? 0} accepted · {counts.PENDING ?? 0} pending
                                · {counts.REMOVED ?? 0} removed · {counts.EXCLUDED ?? 0} excluded
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
                                    {isOwner && participant.status === "APPLIED" && <div className="flex gap-2"><button type="button" disabled={!!busy} onClick={() => void reviewApplication(person._id, "accept")} className="border border-success px-3 py-1.5 text-xs font-semibold text-success">Accept request</button><button type="button" disabled={!!busy} onClick={() => void reviewApplication(person._id, "reject")} className="border border-danger px-3 py-1.5 text-xs font-semibold text-danger">Reject</button></div>}
                                    {(canRateParticipant || (isOwner && participant.status !== "APPLIED")) && (
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
                                            {isOwner && (participant.status === "ACCEPTED" || participant.status === "PENDING") && (
                                                <button
                                                    type="button"
                                                    title={participant.status === "PENDING" ? "Remove invitation" : "Remove participant"}
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
