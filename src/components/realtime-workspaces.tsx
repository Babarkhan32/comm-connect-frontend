"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Bell, MessageCircle, Send } from "lucide-react";

import { api, getList, getSession, SOCKET_URL } from "@/lib/api";
import type { ChatMessage, ChatRoom, Notification } from "@/lib/types";
import { Button, EmptyState } from "./ui";

/* ============================================================
   HELPERS
   ============================================================ */

function roomTitle(room: ChatRoom) {
    return typeof room.broadcastId === "object" &&
        room.broadcastId?.title
        ? room.broadcastId.title
        : "Untitled broadcast";
}

function roomParticipants(room: ChatRoom) {
    return `${room.participantIds.length} participants`;
}

function roomSortValue(room: ChatRoom) {
    return (
        new Date(room.lastMessageAt ?? "").getTime() ||
        new Date(
            (room as ChatRoom & { createdAt?: string }).createdAt ?? ""
        ).getTime() ||
        0
    );
}

function relativeMessageTime(value?: string) {
    if (!value) return "No messages yet";

    const elapsedSeconds = Math.floor(
        (Date.now() - new Date(value).getTime()) / 1000
    );

    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
        return "No messages yet";
    }

    if (elapsedSeconds < 60) {
        return "Just now";
    }

    if (elapsedSeconds < 3600) {
        return `${Math.floor(elapsedSeconds / 60)}m ago`;
    }

    if (elapsedSeconds < 86400) {
        return `${Math.floor(elapsedSeconds / 3600)}h ago`;
    }

    return `${Math.floor(elapsedSeconds / 86400)}d ago`;
}

/* ============================================================
   CHAT WORKSPACE
   ============================================================ */

export function ChatWorkspace() {
    const userId = getSession()?.user?._id;

    const socketRef = useRef<Socket | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [roomPage, setRoomPage] = useState(1);
    const [roomPages, setRoomPages] = useState(1);
    const [loadingRooms, setLoadingRooms] = useState(false);

    const roomSentinelRef = useRef<HTMLDivElement | null>(null);

    const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");

    const [typingUsers, setTypingUsers] = useState<
        { userId: string; name: string }[]
    >([]);

    /* ========================================================
       LOAD ROOMS
       ======================================================== */

    useEffect(() => {
        let cancelled = false;

        setLoadingRooms(true);

        getList<ChatRoom>(
            `/chat/me/rooms?page=${roomPage}&limit=20`
        )
            .then((result) => {
                if (cancelled) return;

                setRooms((current) =>
                    roomPage === 1
                        ? result.data
                        : [...current, ...result.data]
                );

                setRoomPages(Math.max(result.pages, 1));

                if (roomPage === 1) {
                    setActiveRoom(result.data[0] ?? null);
                }
            })
            .catch((reason: Error) => {
                if (!cancelled) {
                    setError(reason.message);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingRooms(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [roomPage]);

    /* ========================================================
       LOAD MORE ROOMS
       ======================================================== */

    useEffect(() => {
        const sentinel = roomSentinelRef.current;

        if (
            !sentinel ||
            roomPage >= roomPages ||
            loadingRooms
        ) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0]?.isIntersecting &&
                    !loadingRooms
                ) {
                    setRoomPage((page) =>
                        Math.min(roomPages, page + 1)
                    );
                }
            },
            { rootMargin: "160px" }
        );

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [roomPage, roomPages, loadingRooms]);

    /* ========================================================
       UNREAD CHAT EVENT
       ======================================================== */

    useEffect(() => {
        function onUnread(event: Event) {
            const detail = (
                event as CustomEvent<{
                    roomId: string;
                    timestamp?: string;
                }>
            ).detail;

            if (!detail?.roomId) return;

            setRooms((current) =>
                current
                    .map((room) =>
                        room._id === detail.roomId
                            ? {
                                ...room,
                                unreadCount:
                                    Number(room.unreadCount ?? 0) + 1,
                                lastMessageAt:
                                    detail.timestamp ??
                                    room.lastMessageAt,
                            }
                            : room
                    )
                    .sort(
                        (left, right) =>
                            roomSortValue(right) -
                            roomSortValue(left)
                    )
            );
        }

        window.addEventListener(
            "comm-connect:chat-unread",
            onUnread
        );

        return () =>
            window.removeEventListener(
                "comm-connect:chat-unread",
                onUnread
            );
    }, []);

    /* ========================================================
       LOAD ACTIVE ROOM / SOCKET
       ======================================================== */

    useEffect(() => {
        if (!activeRoom || !userId) return;

        setTypingUsers([]);

        /*
         * Load existing messages.
         */
        getList<ChatMessage>(
            `/chat/rooms/${activeRoom._id}/messages?limit=100`
        )
            .then((result) => {
                setMessages(result.data);
            })
            .catch((reason: Error) => {
                setError(reason.message);
            });

        /*
         * Disabled room → no socket.
         */
        if (activeRoom.disabled) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            return;
        }

        /*
         * Mark room as read.
         */
        api(`/chat/rooms/${activeRoom._id}/read`, {
            method: "PATCH",
        })
            .then(() => {
                setRooms((current) =>
                    current.map((room) =>
                        room._id === activeRoom._id
                            ? {
                                ...room,
                                unreadCount: 0,
                            }
                            : room
                    )
                );

                window.dispatchEvent(
                    new Event("comm-connect:chat-read")
                );
            })
            .catch(() => undefined);

        /* ====================================================
           SOCKET
           ==================================================== */

        const socket = io(`${SOCKET_URL}/ws`, {
            query: { userId },
        });

        socketRef.current = socket;

        socket.emit("chat:join_room", {
            roomId: activeRoom._id,
            userId,
        });

        /* ====================================================
           NEW MESSAGE
           ==================================================== */

        socket.on(
            "chat:new_message",
            (message: {
                messageId: string;
                roomId: string;
                senderId: string;
                senderName?: string;
                content: string;
                timestamp: string;
            }) => {
                if (message.roomId !== activeRoom._id) {
                    return;
                }

                setMessages((current) => [
                    ...current,
                    {
                        _id: message.messageId,
                        senderId: message.senderId,
                        senderName: message.senderName,
                        content: message.content,
                        createdAt: message.timestamp,
                    },
                ]);

                setRooms((current) =>
                    current.map((room) =>
                        room._id === message.roomId
                            ? {
                                ...room,
                                lastMessageAt:
                                    message.timestamp,
                            }
                            : room
                    )
                );

                setTypingUsers((prev) =>
                    prev.filter(
                        (u) => u.userId !== message.senderId
                    )
                );

                if (message.senderId !== userId) {
                    api(
                        `/chat/rooms/${activeRoom._id}/read`,
                        {
                            method: "PATCH",
                        }
                    )
                        .then(() => {
                            window.dispatchEvent(
                                new Event(
                                    "comm-connect:chat-read"
                                )
                            );
                        })
                        .catch(() => undefined);
                }
            }
        );

        /* ====================================================
           TYPING INDICATOR
           ==================================================== */

        socket.on(
            "chat:user_typing",
            (data: {
                roomId: string;
                userId: string;
                name: string;
                isTyping: boolean;
            }) => {
                if (
                    data.roomId !== activeRoom._id ||
                    data.userId === userId
                ) {
                    return;
                }

                setTypingUsers((prev) => {
                    if (data.isTyping) {
                        if (
                            prev.some(
                                (u) =>
                                    u.userId === data.userId
                            )
                        ) {
                            return prev;
                        }

                        return [
                            ...prev,
                            {
                                userId: data.userId,
                                name: data.name,
                            },
                        ];
                    }

                    return prev.filter(
                        (u) =>
                            u.userId !== data.userId
                    );
                });
            }
        );

        /* ====================================================
           SOCKET ERROR
           ==================================================== */

        socket.on(
            "error",
            (socketError: { message: string }) => {
                setError(socketError.message);
            }
        );

        /* ====================================================
           CLEANUP
           ==================================================== */

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(
                    typingTimeoutRef.current
                );
            }

            socket.emit("chat:leave_room", {
                roomId: activeRoom._id,
                userId,
            });

            socket.disconnect();
            socketRef.current = null;

            setTypingUsers([]);
        };
    }, [activeRoom, userId]);

    /* ========================================================
       TYPING HELPERS
       ======================================================== */

    function emitTyping(isTyping: boolean) {
        if (
            !socketRef.current ||
            !activeRoom ||
            activeRoom.disabled ||
            !userId
        ) {
            return;
        }

        socketRef.current.emit("chat:typing", {
            roomId: activeRoom._id,
            userId,
            isTyping,
        });
    }

    function handleDraftChange(value: string) {
        setDraft(value);

        emitTyping(true);

        if (typingTimeoutRef.current) {
            clearTimeout(
                typingTimeoutRef.current
            );
        }

        typingTimeoutRef.current = setTimeout(() => {
            emitTyping(false);
        }, 1500);
    }

    /* ========================================================
       SEND MESSAGE
       ======================================================== */

    function send(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (
            !activeRoom ||
            activeRoom.disabled ||
            !userId ||
            !draft.trim()
        ) {
            return;
        }

        if (typingTimeoutRef.current) {
            clearTimeout(
                typingTimeoutRef.current
            );
        }

        emitTyping(false);

        socketRef.current?.emit(
            "chat:send_message",
            {
                roomId: activeRoom._id,
                userId,
                content: draft.trim(),
            }
        );

        setDraft("");
    }

    /* ========================================================
       EMPTY STATE
       ======================================================== */

    if (!rooms.length && !error) {
        return (
            <EmptyState
                icon={
                    <MessageCircle className="size-5" />
                }
                title="No conversations yet"
            >
                Accept a broadcast invitation to join its
                group chat.
            </EmptyState>
        );
    }

    /* ========================================================
       UI
       ======================================================== */

    return (
        <div
            className="
                grid
                min-h-[calc(100vh-12rem)]
                overflow-hidden
                rounded-lg
                border
                border-border
                bg-surface
                shadow-sm

                md:grid-cols-[18rem_minmax(0,1fr)]
            "
        >
            {/* ==================================================
                ROOM LIST
            ================================================== */}

            <aside
                className="
                    flex
                    min-h-0
                    flex-col
                    overflow-hidden
                    border-b
                    border-border
                    md:border-b-0
                    md:border-r
                "
            >
                <div className="shrink-0 border-b border-border px-4 py-3 text-sm font-semibold text-ink">
                    Conversations
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {rooms.map((room) => (
                        <button
                            key={room._id}
                            onClick={() =>
                                setActiveRoom(room)
                            }
                            className={`
                                block
                                w-full
                                border-b
                                border-border
                                px-4
                                py-3
                                text-left
                                transition-colors

                                ${activeRoom?._id ===
                                    room._id
                                    ? "bg-accent-subtle text-accent"
                                    : "text-ink hover:bg-surface-muted"
                                }
                            `}
                        >
                            <span className="flex items-start gap-2">
                                {typeof room.broadcastId ===
                                    "object" &&
                                    room.broadcastId
                                        ?.coverImageUrl ? (
                                    <img
                                        src={
                                            room.broadcastId
                                                .coverImageUrl
                                        }
                                        alt="Broadcast"
                                        className="size-9 shrink-0 rounded-md object-contain object-top"
                                    />
                                ) : (
                                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent-subtle text-accent">
                                        <MessageCircle className="size-4" />
                                    </span>
                                )}

                                <span className="flex min-w-0 flex-1 items-start justify-between gap-2">
                                    <strong className="min-w-0 truncate text-sm">
                                        {roomTitle(room)}
                                    </strong>

                                    <span className="flex shrink-0 items-center gap-1.5">
                                        {room.disabled && (
                                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                                                Expired
                                            </span>
                                        )}

                                        {!room.disabled &&
                                            (room.unreadCount ??
                                                0) >
                                            0 && (
                                                <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-surface">
                                                    {room.unreadCount! >
                                                        99
                                                        ? "99+"
                                                        : room.unreadCount}
                                                </span>
                                            )}
                                    </span>
                                </span>
                            </span>

                            <span className="mt-1 block truncate text-xs text-ink-muted">
                                {roomParticipants(room)}
                            </span>

                            <span className="mt-1 block text-xs text-ink-muted">
                                {relativeMessageTime(
                                    room.lastMessageAt
                                )}
                            </span>
                        </button>
                    ))}

                    <div
                        ref={roomSentinelRef}
                        className="h-2"
                        aria-hidden="true"
                    />

                    {loadingRooms && (
                        <p className="px-4 py-3 text-xs text-ink-muted">
                            Loading more conversations...
                        </p>
                    )}
                </div>
            </aside>

            {/* ==================================================
                CHAT
            ================================================== */}

            <section
                className="
                    flex
                    min-h-0
                    min-w-0
                    flex-col
                    overflow-hidden
                "
            >
                {/* ==================================================
                    CHAT HEADER
                ================================================== */}

                <div className="shrink-0 border-b border-border px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <strong className="block truncate text-sm text-ink">
                                {activeRoom
                                    ? roomTitle(activeRoom)
                                    : "Select a conversation"}
                            </strong>

                            {activeRoom && (
                                <span className="mt-1 block truncate text-xs text-ink-muted">
                                    {roomParticipants(
                                        activeRoom
                                    )}
                                </span>
                            )}
                        </div>

                        {activeRoom?.disabled && (
                            <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-muted">
                                Expired
                            </span>
                        )}
                    </div>
                </div>

                {/* ==================================================
                    MESSAGES
                ================================================== */}

                <div
                    className="
                        min-h-0
                        flex-1
                        overflow-y-auto
                        p-5
                    "
                >
                    <div className="space-y-3">
                        {messages.length === 0 &&
                            activeRoom && (
                                <div className="flex min-h-[20rem] items-center justify-center text-sm text-ink-muted">
                                    No messages yet.
                                </div>
                            )}

                        {messages.map((message) => (
                            <div
                                key={message._id}
                                className={`
                                    max-w-[80%]
                                    ${message.senderId ===
                                        userId
                                        ? "ml-auto"
                                        : ""
                                    }
                                `}
                            >
                                <div
                                    className={`
                                        rounded-md
                                        px-3
                                        py-2
                                        text-sm
                                        leading-6
                                        ${message.senderId === userId
                                            ? "bg-accent text-surface"
                                            : "bg-accent-subtle text-ink"
                                        }
                                    `}
                                >
                                    <span className="mb-1 block text-xs font-semibold opacity-80">
                                        {message.senderId ===
                                            userId
                                            ? "You"
                                            : message.senderName ??
                                            "Community member"}
                                    </span>

                                    <span className="whitespace-pre-wrap break-words">
                                        {message.content}
                                    </span>
                                </div>

                                <p className="mt-1 text-xs text-ink-muted">
                                    {new Date(
                                        message.createdAt
                                    ).toLocaleTimeString(
                                        [],
                                        {
                                            hour: "numeric",
                                            minute: "2-digit",
                                        }
                                    )}
                                </p>
                            </div>
                        ))}

                        {/* ==================================================
                            TYPING INDICATOR
                        ================================================== */}

                        {typingUsers.length > 0 && (
                            <div className="px-1 text-sm italic text-ink-muted">
                                {typingUsers
                                    .map((u) => u.name)
                                    .join(", ")}{" "}
                                {typingUsers.length === 1
                                    ? "is"
                                    : "are"}{" "}
                                typing
                                <span className="animate-pulse">
                                    ...
                                </span>
                            </div>
                        )}

                        {error && (
                            <p
                                role="alert"
                                className="text-sm text-danger"
                            >
                                {error}
                            </p>
                        )}
                    </div>
                </div>

                {/* ==================================================
                    DISABLED CHAT
                ================================================== */}

                {activeRoom?.disabled ? (
                    <div className="shrink-0 border-t border-border bg-surface-muted px-4 py-4 text-center">
                        <p className="text-sm font-medium text-ink">
                            This chat has expired
                        </p>

                        <p className="mt-1 text-xs text-ink-muted">
                            This broadcast has ended. You can
                            still view the previous messages,
                            but no new messages can be sent.
                        </p>
                    </div>
                ) : (
                    /* ==================================================
                       MESSAGE INPUT
                    ================================================== */

                    <form
                        onSubmit={send}
                        className="flex shrink-0 gap-2 border-t border-border p-3"
                    >
                        <input
                            value={draft}
                            onChange={(event) =>
                                handleDraftChange(
                                    event.target.value
                                )
                            }
                            disabled={
                                !activeRoom ||
                                activeRoom.disabled
                            }
                            maxLength={2000}
                            placeholder="Write a message"
                            className="
                                h-11
                                min-w-0
                                flex-1
                                rounded-md
                                border
                                border-border
                                px-3
                                text-sm
                                outline-none
                                focus:border-accent
                                disabled:cursor-not-allowed
                                disabled:bg-surface-muted
                                disabled:text-ink-muted
                            "
                        />

                        <Button
                            type="submit"
                            className="w-11 shrink-0 px-0"
                            disabled={
                                !activeRoom ||
                                activeRoom.disabled ||
                                !draft.trim()
                            }
                        >
                            <Send className="size-4" />
                            <span className="sr-only">
                                Send message
                            </span>
                        </Button>
                    </form>
                )}
            </section>
        </div>
    );
}

/* ============================================================
   NOTIFICATION WORKSPACE
   ============================================================ */

export function NotificationWorkspace() {
    const userId = getSession()?.user?._id;

    const [notifications, setNotifications] =
        useState<Notification[]>([]);

    const [error, setError] = useState("");

    useEffect(() => {
        getList<Notification>(
            "/notifications?limit=50"
        )
            .then((result) =>
                setNotifications(result.data)
            )
            .catch((reason: Error) =>
                setError(reason.message)
            );

        if (!userId) return;

        const socket = io(
            `${SOCKET_URL}/notifications`,
            {
                query: {
                    userId,
                },
            }
        );

        socket.emit(
            "notification:subscribe",
            {
                userId,
            }
        );

        socket.on(
            "notification:new",
            (event: {
                type: string;
                data: Record<string, unknown>;
                timestamp: string;
            }) =>
                setNotifications((current) => [
                    {
                        _id: crypto.randomUUID(),
                        type: event.type,
                        data: event.data,
                        read: false,
                        createdAt: event.timestamp,
                    },
                    ...current,
                ])
        );

        return () => {
            socket.disconnect();
        };
    }, [userId]);

    async function markRead(id: string) {
        try {
            await api(
                `/notifications/${id}/read`,
                {
                    method: "PATCH",
                }
            );

            setNotifications((current) =>
                current.map((notification) =>
                    notification._id === id
                        ? {
                            ...notification,
                            read: true,
                        }
                        : notification
                )
            );

            window.dispatchEvent(
                new Event(
                    "comm-connect:notification-read"
                )
            );
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "Could not update notification."
            );
        }
    }

    async function markAllRead() {
        try {
            await api(
                "/notifications/read-all",
                {
                    method: "PATCH",
                }
            );

            setNotifications((current) =>
                current.map(
                    (notification) => ({
                        ...notification,
                        read: true,
                    })
                )
            );

            window.dispatchEvent(
                new Event(
                    "comm-connect:notification-read"
                )
            );
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "Could not update notifications."
            );
        }
    }

    if (!notifications.length && !error) {
        return (
            <EmptyState
                icon={
                    <Bell className="size-5" />
                }
                title="All caught up"
            >
                New invitations, replies, and activity
                will appear here in real time.
            </EmptyState>
        );
    }

    return (
        <div>
            {error && (
                <p
                    role="alert"
                    className="mb-4 text-sm text-danger"
                >
                    {error}
                </p>
            )}

            <div className="mb-4 flex justify-end">
                <button
                    onClick={markAllRead}
                    className="text-sm font-semibold text-accent hover:text-accent-hover"
                >
                    Mark all as read
                </button>
            </div>

            <div className="border border-border bg-surface">
                {notifications.map(
                    (notification) => (
                        <button
                            key={notification._id}
                            onClick={() =>
                                !notification.read &&
                                markRead(
                                    notification._id
                                )
                            }
                            className={`
                                flex
                                w-full
                                gap-4
                                border-b
                                border-border
                                p-5
                                text-left
                                last:border-0
                                ${notification.read
                                    ? "text-ink-muted"
                                    : "bg-accent-subtle/40 text-ink"
                                }
                            `}
                        >
                            <span
                                className={`
                                    mt-1
                                    size-2
                                    shrink-0
                                    rounded-full
                                    ${notification.read
                                        ? "bg-border"
                                        : "bg-accent"
                                    }
                                `}
                            />

                            <span>
                                <strong className="block text-sm">
                                    {notification.type.replaceAll(
                                        "_",
                                        " "
                                    )}
                                </strong>

                                <span className="mt-1 block text-sm">
                                    {Object.values(
                                        notification.data
                                    )
                                        .filter(
                                            (value) =>
                                                typeof value ===
                                                "string"
                                        )
                                        .join(" · ") ||
                                        "There is new activity in your community."}
                                </span>

                                <time className="mt-2 block text-xs">
                                    {new Date(
                                        notification.createdAt
                                    ).toLocaleString()}
                                </time>
                            </span>
                        </button>
                    )
                )}
            </div>
        </div>
    );
}