"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Bell, MessageCircle, Send } from "lucide-react";
import { api, getList, getSession, SOCKET_URL } from "@/lib/api";
import type { ChatMessage, ChatRoom, Notification } from "@/lib/types";
import { Button, EmptyState } from "./ui";

function LegacyChatWorkspace() {
    const session = getSession();
    const userId = session?.user?._id;
    const socketRef = useRef<Socket | null>(null);
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");
    useEffect(() => { getList<ChatRoom>("/chat/me/rooms?limit=50").then((result) => { setRooms(result.data); setActiveRoom(result.data[0] ?? null); }).catch((reason: Error) => setError(reason.message)); }, []);
    useEffect(() => { if (!activeRoom || !userId) return; getList<ChatMessage>(`/chat/rooms/${activeRoom._id}/messages?limit=100`).then((result) => setMessages(result.data.reverse())).catch((reason: Error) => setError(reason.message)); const socket = io(`${SOCKET_URL}/ws`, { query: { userId } }); socketRef.current = socket; socket.emit("chat:join_room", { roomId: activeRoom._id, userId }); socket.on("chat:new_message", (message: { messageId: string; roomId: string; senderId: string; content: string; timestamp: string }) => { if (message.roomId === activeRoom._id) setMessages((current) => [...current, { _id: message.messageId, senderId: message.senderId, content: message.content, createdAt: message.timestamp }]); }); socket.on("error", (socketError: { message: string }) => setError(socketError.message)); return () => { socket.emit("chat:leave_room", { roomId: activeRoom._id, userId }); socket.disconnect(); socketRef.current = null; }; }, [activeRoom, userId]);
    function send(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!activeRoom || !userId || !draft.trim()) return; socketRef.current?.emit("chat:send_message", { roomId: activeRoom._id, userId, content: draft.trim() }); setDraft(""); }
    if (!rooms.length && !error) return <EmptyState icon={<MessageCircle className="size-5" />} title="No conversations yet">When a broadcast brings people together, its chat will appear here.</EmptyState>;
    return <div className="grid min-h-[32rem] border border-border bg-surface md:grid-cols-[15rem_1fr]"><aside className="border-b border-border md:border-r md:border-b-0"><div className="border-b border-border px-4 py-3 text-sm font-semibold text-ink">Conversations</div>{rooms.map((room) => <button key={room._id} onClick={() => setActiveRoom(room)} className={`block w-full border-b border-border px-4 py-3 text-left text-sm ${activeRoom?._id === room._id ? "bg-accent-subtle text-accent" : "text-ink hover:bg-surface-muted"}`}><strong className="block truncate">Community chat</strong><span className="mt-1 block text-xs text-ink-muted">{room.messageCount} messages</span></button>)}</aside><section className="flex min-h-[24rem] flex-col"><div className="border-b border-border px-5 py-3 text-sm font-semibold text-ink">{activeRoom ? "Community chat" : "Select a conversation"}</div><div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.map((message) => <div key={message._id} className={`max-w-[80%] ${message.senderId === userId ? "ml-auto" : ""}`}><div className={`px-3 py-2 text-sm leading-6 ${message.senderId === userId ? "bg-accent text-surface" : "bg-surface-muted text-ink"}`}>{message.content}</div><p className="mt-1 text-xs text-ink-muted">{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div>)}{error && <p className="text-sm text-danger">{error}</p>}</div><form onSubmit={send} className="flex gap-2 border-t border-border p-3"><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!activeRoom} maxLength={2000} placeholder="Write a message" className="h-11 min-w-0 flex-1 border border-border px-3 text-sm outline-none focus:border-accent" /><Button type="submit" className="w-11 px-0" disabled={!activeRoom || !draft.trim()}><Send className="size-4" /><span className="sr-only">Send message</span></Button></form></section></div>;
}

function roomTitle(room: ChatRoom) {
    return typeof room.broadcastId === "object" && room.broadcastId?.title ? room.broadcastId.title : "Untitled broadcast";
}

function roomParticipants(room: ChatRoom) {
    return `${room.participantIds.length} participants`;
}

function LegacyTitleChatWorkspace() {
    const userId = getSession()?.user?._id;
    const socketRef = useRef<Socket | null>(null);
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        getList<ChatRoom>("/chat/me/rooms?limit=50")
            .then((result) => { setRooms(result.data); setActiveRoom(result.data[0] ?? null); })
            .catch((reason: Error) => setError(reason.message));
    }, []);

    useEffect(() => {
        function onUnread(event: Event) {
            const { roomId, timestamp } = (event as CustomEvent<{ roomId: string; timestamp?: string }>).detail;
            setRooms((current) => current.map((room) => room._id === roomId
                ? { ...room, unreadCount: (room.unreadCount ?? 0) + 1, lastMessageAt: timestamp ?? room.lastMessageAt }
                : room));
        }
        window.addEventListener("comm-connect:chat-unread", onUnread);
        return () => window.removeEventListener("comm-connect:chat-unread", onUnread);
    }, []);

    useEffect(() => {
        function onUnread(event: Event) {
            const { roomId } = (event as CustomEvent<{ roomId: string }>).detail;
            setRooms((current) => current.map((room) => room._id === roomId ? { ...room, unreadCount: (room.unreadCount ?? 0) + 1 } : room));
        }
        window.addEventListener("comm-connect:chat-unread", onUnread);
        return () => window.removeEventListener("comm-connect:chat-unread", onUnread);
    }, []);

    useEffect(() => {
        if (!activeRoom || !userId) return;
        getList<ChatMessage>(`/chat/rooms/${activeRoom._id}/messages?limit=100`)
            .then((result) => setMessages(result.data))
            .catch((reason: Error) => setError(reason.message));

        const socket = io(`${SOCKET_URL}/ws`, { query: { userId } });
        socketRef.current = socket;
        socket.emit("chat:join_room", { roomId: activeRoom._id, userId });
        socket.on("chat:new_message", (message: { messageId: string; roomId: string; senderId: string; content: string; timestamp: string }) => {
            if (message.roomId === activeRoom._id) setMessages((current) => [...current, { _id: message.messageId, senderId: message.senderId, content: message.content, createdAt: message.timestamp }]);
        });
        socket.on("error", (socketError: { message: string }) => setError(socketError.message));
        return () => { socket.emit("chat:leave_room", { roomId: activeRoom._id, userId }); socket.disconnect(); socketRef.current = null; };
    }, [activeRoom, userId]);

    function send(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!activeRoom || !userId || !draft.trim()) return;
        socketRef.current?.emit("chat:send_message", { roomId: activeRoom._id, userId, content: draft.trim() });
        setDraft("");
    }

    if (!rooms.length && !error) return <EmptyState icon={<MessageCircle className="size-5" />} title="No conversations yet">Accept a broadcast invitation to join its group chat.</EmptyState>;
    return <div className="grid min-h-[32rem] overflow-hidden rounded-lg border border-border bg-surface shadow-sm md:grid-cols-[17rem_1fr]"><aside className="border-b border-border md:border-r md:border-b-0"><div className="border-b border-border px-4 py-3 text-sm font-semibold text-ink">Conversations</div>{rooms.map((room) => <button key={room._id} onClick={() => setActiveRoom(room)} className={`block w-full border-b border-border px-4 py-3 text-left transition-colors ${activeRoom?._id === room._id ? "bg-accent-subtle text-accent" : "text-ink hover:bg-surface-muted"}`}><strong className="block truncate text-sm">{roomTitle(room)}</strong><span className="mt-1 block truncate text-xs text-ink-muted">{roomParticipants(room)}</span><span className="mt-1 block text-xs text-ink-muted">{room.messageCount} messages</span></button>)}</aside><section className="flex min-h-[24rem] flex-col"><div className="border-b border-border px-5 py-3"><strong className="block text-sm text-ink">{activeRoom ? roomTitle(activeRoom) : "Select a conversation"}</strong>{activeRoom && <span className="mt-1 block truncate text-xs text-ink-muted">{roomParticipants(activeRoom)}</span>}</div><div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.map((message) => <div key={message._id} className={`max-w-[80%] ${message.senderId === userId ? "ml-auto" : ""}`}><div className={`rounded-md px-3 py-2 text-sm leading-6 ${message.senderId === userId ? "bg-accent text-surface" : "bg-surface-muted text-ink"}`}>{message.content}</div><p className="mt-1 text-xs text-ink-muted">{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div>)}{error && <p className="text-sm text-danger">{error}</p>}</div><form onSubmit={send} className="flex gap-2 border-t border-border p-3"><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!activeRoom} maxLength={2000} placeholder="Write a message" className="h-11 min-w-0 flex-1 rounded-md border border-border px-3 text-sm outline-none focus:border-accent" /><Button type="submit" className="w-11 px-0" disabled={!activeRoom || !draft.trim()}><Send className="size-4" /><span className="sr-only">Send message</span></Button></form></section></div>;
}

function relativeMessageTime(value?: string) {
    if (!value) return "No messages yet";
    const elapsedSeconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return "No messages yet";
    if (elapsedSeconds < 60) return "Just now";
    if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
    if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
    return `${Math.floor(elapsedSeconds / 86400)}d ago`;
}

export function ChatWorkspace() {
    const userId = getSession()?.user?._id;
    const socketRef = useRef<Socket | null>(null);
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        getList<ChatRoom>("/chat/me/rooms?limit=50")
            .then((result) => { setRooms(result.data); setActiveRoom(result.data[0] ?? null); })
            .catch((reason: Error) => setError(reason.message));
    }, []);

    useEffect(() => {
        function onUnread(event: Event) {
            const detail = (event as CustomEvent<{ roomId: string; timestamp?: string }>).detail;
            if (!detail?.roomId) return;
            setRooms((current) => current.map((room) => room._id === detail.roomId
                ? { ...room, unreadCount: Number(room.unreadCount ?? 0) + 1, lastMessageAt: detail.timestamp ?? room.lastMessageAt }
                : room));
        }

        window.addEventListener("comm-connect:chat-unread", onUnread);
        return () => window.removeEventListener("comm-connect:chat-unread", onUnread);
    }, []);

    useEffect(() => {
        if (!activeRoom || !userId) return;
        Promise.all([api(`/chat/rooms/${activeRoom._id}/read`, { method: "PATCH" }), getList<ChatMessage>(`/chat/rooms/${activeRoom._id}/messages?limit=100`)])
            .then(([, result]) => { setMessages(result.data); setRooms((current) => current.map((room) => room._id === activeRoom._id ? { ...room, unreadCount: 0 } : room)); window.dispatchEvent(new Event("comm-connect:chat-read")); })
            .catch((reason: Error) => setError(reason.message));
        const socket = io(`${SOCKET_URL}/ws`, { query: { userId } });
        socketRef.current = socket;
        socket.emit("chat:join_room", { roomId: activeRoom._id, userId });
        socket.on("chat:new_message", (message: { messageId: string; roomId: string; senderId: string; content: string; timestamp: string }) => {
            if (message.roomId !== activeRoom._id) return;
            setMessages((current) => [...current, { _id: message.messageId, senderId: message.senderId, content: message.content, createdAt: message.timestamp }]);
            setRooms((current) => current.map((room) => room._id === message.roomId ? { ...room, lastMessageAt: message.timestamp } : room));
            if (message.senderId !== userId) {
                api(`/chat/rooms/${activeRoom._id}/read`, { method: "PATCH" })
                    .then(() => window.dispatchEvent(new Event("comm-connect:chat-read")))
                    .catch(() => undefined);
            }
        });
        socket.on("error", (socketError: { message: string }) => setError(socketError.message));
        return () => { socket.emit("chat:leave_room", { roomId: activeRoom._id, userId }); socket.disconnect(); socketRef.current = null; };
    }, [activeRoom, userId]);

    function send(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!activeRoom || !userId || !draft.trim()) return; socketRef.current?.emit("chat:send_message", { roomId: activeRoom._id, userId, content: draft.trim() }); setDraft(""); }

    if (!rooms.length && !error) return <EmptyState icon={<MessageCircle className="size-5" />} title="No conversations yet">Accept a broadcast invitation to join its group chat.</EmptyState>;
    return <div className="grid min-h-[32rem] overflow-hidden rounded-lg border border-border bg-surface shadow-sm md:grid-cols-[17rem_1fr]"><aside className="border-b border-border md:border-r md:border-b-0"><div className="border-b border-border px-4 py-3 text-sm font-semibold text-ink">Conversations</div>{rooms.map((room) => <button key={room._id} onClick={() => setActiveRoom(room)} className={`block w-full border-b border-border px-4 py-3 text-left transition-colors ${activeRoom?._id === room._id ? "bg-accent-subtle text-accent" : "text-ink hover:bg-surface-muted"}`}><span className="flex items-start justify-between gap-2"><strong className="min-w-0 truncate text-sm">{roomTitle(room)}</strong>{(room.unreadCount ?? 0) > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-surface">{room.unreadCount! > 99 ? "99+" : room.unreadCount}</span>}</span><span className="mt-1 block truncate text-xs text-ink-muted">{roomParticipants(room)}</span><span className="mt-1 block text-xs text-ink-muted">{relativeMessageTime(room.lastMessageAt)}</span></button>)}</aside><section className="flex min-h-[24rem] flex-col"><div className="border-b border-border px-5 py-3"><strong className="block text-sm text-ink">{activeRoom ? roomTitle(activeRoom) : "Select a conversation"}</strong>{activeRoom && <span className="mt-1 block truncate text-xs text-ink-muted">{roomParticipants(activeRoom)}</span>}</div><div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.map((message) => <div key={message._id} className={`max-w-[80%] ${message.senderId === userId ? "ml-auto" : ""}`}><div className={`rounded-md px-3 py-2 text-sm leading-6 ${message.senderId === userId ? "bg-accent text-surface" : "bg-surface-muted text-ink"}`}>{message.content}</div><p className="mt-1 text-xs text-ink-muted">{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div>)}{error && <p className="text-sm text-danger">{error}</p>}</div><form onSubmit={send} className="flex gap-2 border-t border-border p-3"><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!activeRoom} maxLength={2000} placeholder="Write a message" className="h-11 min-w-0 flex-1 rounded-md border border-border px-3 text-sm outline-none focus:border-accent" /><Button type="submit" className="w-11 px-0" disabled={!activeRoom || !draft.trim()}><Send className="size-4" /><span className="sr-only">Send message</span></Button></form></section></div>;
}

export function NotificationWorkspace() {
    const userId = getSession()?.user?._id;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [error, setError] = useState("");
    useEffect(() => { getList<Notification>("/notifications?limit=50").then((result) => setNotifications(result.data)).catch((reason: Error) => setError(reason.message)); if (!userId) return; const socket = io(`${SOCKET_URL}/notifications`, { query: { userId } }); socket.emit("notification:subscribe", { userId }); socket.on("notification:new", (event: { type: string; data: Record<string, unknown>; timestamp: string }) => setNotifications((current) => [{ _id: crypto.randomUUID(), type: event.type, data: event.data, read: false, createdAt: event.timestamp }, ...current])); return () => socket.disconnect(); }, [userId]);
    async function markRead(id: string) { try { await api(`/notifications/${id}/read`, { method: "PATCH" }); setNotifications((current) => current.map((notification) => notification._id === id ? { ...notification, read: true } : notification)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update notification."); } }
    async function markAllRead() { try { await api("/notifications/read-all", { method: "PATCH" }); setNotifications((current) => current.map((notification) => ({ ...notification, read: true }))); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update notifications."); } }
    if (!notifications.length && !error) return <EmptyState icon={<Bell className="size-5" />} title="All caught up">New invitations, replies, and activity will appear here in real time.</EmptyState>;
    return <div>{error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}<div className="mb-4 flex justify-end"><button onClick={markAllRead} className="text-sm font-semibold text-accent hover:text-accent-hover">Mark all as read</button></div><div className="border border-border bg-surface">{notifications.map((notification) => <button key={notification._id} onClick={() => !notification.read && markRead(notification._id)} className={`flex w-full gap-4 border-b border-border p-5 text-left last:border-0 ${notification.read ? "text-ink-muted" : "bg-accent-subtle/40 text-ink"}`}><span className={`mt-1 size-2 shrink-0 rounded-full ${notification.read ? "bg-border" : "bg-accent"}`} /><span><strong className="block text-sm">{notification.type.replaceAll("_", " ")}</strong><span className="mt-1 block text-sm">{Object.values(notification.data).filter((value) => typeof value === "string").join(" · ") || "There is new activity in your community."}</span><time className="mt-2 block text-xs">{new Date(notification.createdAt).toLocaleString()}</time></span></button>)}</div></div>;
}