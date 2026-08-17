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
    if (notification.type === "broadcast:participant_removed") return `The creator removed you from ${title}. You can no longer join this broadcast.`;
    if (notification.type === "broadcast:rescheduled") return `${title} was rescheduled to ${typeof notification.data.eventDate === "string" ? new Date(notification.data.eventDate).toLocaleString() : "a new time"}. You remain opted in unless you leave.`;
    if (notification.type === "broadcast:application_received") return `${actor} applied to join ${title}.`;
    if (notification.type === "broadcast:application_accepted") return `Your application to join ${title} was accepted by the creator.`;
    if (notification.type === "broadcast:application_rejected") return `Your application to join ${title} was rejected by the creator.`;
    if (notification.type === "broadcast:new") return `${title} is available near ${typeof notification.data.originAddress === "string" ? notification.data.originAddress : "you"}.`;
    if (notification.type === "broadcast:room_created") return "Your group chat is ready.";
    return "There is new activity in your community.";
}

export function NotificationWorkspace() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [error, setError] = useState("");
    useEffect(() => {
        getList<Notification>("/notifications?limit=50").then((result) => setNotifications(result.data)).catch((reason: Error) => setError(reason.message));
        function onNotification(event: Event) {
            const detail = (event as CustomEvent<{ type: string; data: Record<string, unknown>; timestamp?: string }>).detail;
            if (!detail?.type) return;
            const notificationId = typeof detail.data?.notificationId === "string" ? detail.data.notificationId : `realtime-${Date.now()}`;
            setNotifications((current) => [{ _id: notificationId, type: detail.type, data: detail.data, read: false, createdAt: detail.timestamp ?? new Date().toISOString() }, ...current.filter((item) => item._id !== notificationId)]);
        }
        window.addEventListener("comm-connect:notification", onNotification);
        return () => window.removeEventListener("comm-connect:notification", onNotification);
    }, []);
    async function open(notification: Notification) {
        const broadcastId = notification.data.broadcastId;
        try {
            if (!notification.read && !notification._id.startsWith("realtime-")) {
                await api(`/notifications/${notification._id}/read`, { method: "PATCH" });
                setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, read: true } : item));
            }
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not mark notification as read.");
        } finally {
            if (typeof broadcastId === "string") router.push(`/broadcasts/${broadcastId}`);
        }
    }
    async function markAllRead() { try { await api("/notifications/read-all", { method: "PATCH" }); setNotifications((current) => current.map((notification) => ({ ...notification, read: true }))); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update notifications."); } }
    if (!notifications.length && !error) return <EmptyState icon={<Bell className="size-5" />} title="All caught up">New invitations and participant responses will appear here.</EmptyState>;
    return <div>{error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}<div className="mb-4 flex justify-end"><button onClick={markAllRead} className="text-sm font-semibold text-accent hover:text-accent-hover">Mark all as read</button></div><div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">{notifications.map((notification) => <button key={notification._id} onClick={() => void open(notification)} className={`flex w-full gap-4 border-b border-border p-5 text-left transition-colors last:border-0 hover:bg-surface-muted ${notification.read ? "text-ink-muted" : "bg-accent-subtle/40 text-ink"}`}><span className={`mt-1 size-2 shrink-0 rounded-full ${notification.read ? "bg-border" : "bg-accent"}`} /><span><strong className="block text-sm">{notification.type === "broadcast:participant_accepted" ? "Broadcast accepted" : notification.type === "broadcast:participant_passed" ? "Broadcast declined" : notification.type === "broadcast:participant_left" ? "Participant left" : notification.type === "broadcast:participant_removed" ? "Removed from broadcast" : notification.type === "broadcast:application_received" ? "New application" : notification.type === "broadcast:application_accepted" ? "Application accepted" : notification.type === "broadcast:application_rejected" ? "Application rejected" : notification.type === "broadcast:rescheduled" ? "Broadcast rescheduled" : notification.type === "broadcast:new" ? "New broadcast" : "Community update"}</strong><span className="mt-1 block text-sm">{messageFor(notification)}</span><time className="mt-2 block text-xs">{new Date(notification.createdAt).toLocaleString()}</time></span></button>)}</div></div>;
}