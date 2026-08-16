"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { getSession, SOCKET_URL } from "@/lib/api";

export function ChatUnreadListener() {
    useEffect(() => {
        const userId = getSession()?.user?._id;
        if (!userId) return;
        const socket = io(`${SOCKET_URL}/ws`, { query: { userId } });
        socket.on("chat:unread", (event: { roomId: string; timestamp: string }) => {
            window.dispatchEvent(new CustomEvent("comm-connect:chat-unread", { detail: event }));
        });
        return () => socket.disconnect();
    }, []);

    return null;
}