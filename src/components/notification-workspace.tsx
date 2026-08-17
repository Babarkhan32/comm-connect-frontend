"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { api, getList } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { EmptyState } from "./ui";

function messageFor(notification: Notification) {
    const actor = typeof notification.data.actorName === "string" ? notification.data.actorName : "A participant";
    const title = typeof notification.data.broadcastTitle === "string" ? notification.data.broadcastTitle : "your broadcast";
    if (notification.type === "broadcast:participant_accepted") return `${actor} accepted ${title}.`;
    if (notification.type === "broadcast:participant_passed") return `${actor} declined ${title}.`;
    if (notification.type === "broadcast:participant_left") return `${actor} left ${title}.`;
    if (notification.type === "broadcast:new") return `${title} is available near ${typeof notification.data.originAddress === "string" ? notification.data.originAddress : "you"}.`;
    if (notification.type === "broadcast:room_created") return "Your group chat is ready.";
    return "There is new activity in your community.";
}

export function NotificationWorkspace() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [error, setError] = useState("");
    useEffect(() => { getList<Notification>("/notifications?limit=50").then((result) => setNotifications(result.data)).catch((reason: Error) => setError(reason.message)); }, []);
    async function open(notification: Notification) { try { if (!notification.read) { await api(`/notifications/${notification._id}/read`, { method: "PATCH" }); setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, read: true } : item)); } const broadcastId = notification.data.broadcastId; if (notification.type === "broadcast:new") { router.push("/broadcasts?tab=received"); return; } if (typeof broadcastId === "string") router.push(`/broadcasts/${broadcastId}`); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open notification."); } }
    async function markAllRead() { try { await api("/notifications/read-all", { method: "PATCH" }); setNotifications((current) => current.map((notification) => ({ ...notification, read: true }))); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update notifications."); } }
    if (!notifications.length && !error) return <EmptyState icon={<Bell className="size-5" />} title="All caught up">New invitations and participant responses will appear here.</EmptyState>;
    return <div>{error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}<div className="mb-4 flex justify-end"><button onClick={markAllRead} className="text-sm font-semibold text-accent hover:text-accent-hover">Mark all as read</button></div><div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">{notifications.map((notification) => <button key={notification._id} onClick={() => void open(notification)} className={`flex w-full gap-4 border-b border-border p-5 text-left transition-colors last:border-0 hover:bg-surface-muted ${notification.read ? "text-ink-muted" : "bg-accent-subtle/40 text-ink"}`}><span className={`mt-1 size-2 shrink-0 rounded-full ${notification.read ? "bg-border" : "bg-accent"}`} /><span><strong className="block text-sm">{notification.type === "broadcast:participant_accepted" ? "Broadcast accepted" : notification.type === "broadcast:participant_passed" ? "Broadcast declined" : notification.type === "broadcast:participant_left" ? "Participant left" : notification.type === "broadcast:new" ? "New broadcast" : "Community update"}</strong><span className="mt-1 block text-sm">{messageFor(notification)}</span><time className="mt-2 block text-xs">{new Date(notification.createdAt).toLocaleString()}</time></span></button>)}</div></div>;
}