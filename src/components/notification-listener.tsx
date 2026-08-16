"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { io } from "socket.io-client";
import { getSession, SOCKET_URL } from "@/lib/api";
import { showToast } from "./toast";

function notificationMessage(type: string, data: Record<string, unknown>) {
    const actor = typeof data.actorName === "string" ? data.actorName : "A participant";
    const title = typeof data.broadcastTitle === "string" ? ` for ${data.broadcastTitle}` : "";
    if (type === "broadcast:participant_accepted") return `${actor} accepted your broadcast${title}.`;
    if (type === "broadcast:participant_passed") return `${actor} declined your broadcast${title}.`;
    if (type === "broadcast:room_created") return "Your group chat is ready.";
    if (type === "broadcast:new") return `A new broadcast is available${title}.`;
    return "You have a new community update.";
}

export function NotificationListener() {
    const pathname = usePathname();

    useEffect(() => {
        const userId = getSession()?.user?._id;
        if (!userId) return;
        const socket = io(`${SOCKET_URL}/notifications`, { query: { userId } });
        socket.emit("notification:subscribe", { userId });
        socket.on("notification:new", (event: { type: string; data: Record<string, unknown> }) => {
            window.dispatchEvent(new CustomEvent("comm-connect:notification", { detail: event }));
            showToast(notificationMessage(event.type, event.data), event.type === "broadcast:participant_passed" ? "info" : "success");
        });
        return () => socket.disconnect();
    }, [pathname]);

    return null;
}