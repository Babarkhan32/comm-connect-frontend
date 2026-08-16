"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Compass, LayoutDashboard, LogOut, MessageCircle, Plus, UserRound } from "lucide-react";
import { api, clearSession, getList } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { useEffect, useState, type ReactNode } from "react";

const navigation = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/broadcasts", label: "Broadcasts", icon: Compass },
    { href: "/chat", label: "Messages", icon: MessageCircle },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ title, description, children, action }: { title: string; description: string; children: ReactNode; action?: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [notificationCount, setNotificationCount] = useState(0);
    const [chatCount, setChatCount] = useState(0);

    useEffect(() => {
        function refreshCounts() {
            Promise.all([getList<Notification>("/notifications?limit=100&unreadOnly=true"), api<{ unreadCount: number }>("/chat/me/unread-count")])
                .then(([notifications, chats]) => { setNotificationCount(notifications.total); setChatCount(chats.unreadCount); })
                .catch(() => undefined);
        }
        refreshCounts();
        function onChatRead() { refreshCounts(); }
        function onChatMessage() { setChatCount((current) => current + 1); }
        function onChatUnread() { setChatCount((current) => current + 1); }
        function onNotification(event: Event) {
            const detail = (event as CustomEvent<{ type?: string }>).detail;
            setNotificationCount((current) => current + 1);
            if (detail?.type === "broadcast:room_created") refreshCounts();
        }
        window.addEventListener("comm-connect:notification", onNotification);
        window.addEventListener("comm-connect:chat-read", onChatRead);
        window.addEventListener("comm-connect:chat-message", onChatMessage);
        window.addEventListener("comm-connect:chat-unread", onChatUnread);
        return () => { window.removeEventListener("comm-connect:notification", onNotification); window.removeEventListener("comm-connect:chat-read", onChatRead); window.removeEventListener("comm-connect:chat-message", onChatMessage); window.removeEventListener("comm-connect:chat-unread", onChatUnread); };
    }, [pathname]);

    return (
        <div className="min-h-screen bg-canvas">
            <header className="sticky top-0 z-10 border-b border-border/80 bg-surface/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
                    <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-ink"><span className="grid size-8 place-items-center rounded-md bg-accent text-sm text-surface shadow-sm">C</span>Comm Connect</Link>
                    <div className="flex items-center gap-2">
                        <Link href="/broadcasts/new" className="inline-flex size-10 items-center justify-center rounded-md bg-accent text-surface shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-accent-hover" aria-label="Create broadcast" title="Create broadcast">
                            <Plus className="size-5" />
                        </Link>
                        <button className="inline-flex size-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink" onClick={() => { clearSession(); router.push("/login"); }} aria-label="Log out" title="Log out">
                            <LogOut className="size-5" />
                        </button>
                    </div>
                </div>
            </header>
            <div className="mx-auto grid max-w-7xl lg:grid-cols-[14rem_1fr]">
                <aside className="border-b border-border/80 bg-surface/80 px-3 py-4 backdrop-blur-sm lg:min-h-[calc(100vh-4rem)] lg:border-r lg:border-b-0">
                    <nav className="flex gap-1 overflow-x-auto lg:grid">
                        {navigation.map(({ href, label, icon: Icon }) => {
                            const active = href === "/" ? pathname === href : pathname.startsWith(href);
                            const count = href === "/notifications" ? notificationCount : href === "/chat" ? chatCount : 0;
                            return <Link key={href} href={href} className={`inline-flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${active ? "bg-accent text-surface shadow-sm" : "text-ink-muted hover:translate-x-0.5 hover:bg-surface-muted hover:text-ink"}`}><Icon className="size-4" /><span className="flex-1">{label}</span>{count > 0 && <span className={`grid min-w-5 place-items-center rounded-full px-1 text-xs ${active ? "bg-surface/20 text-surface" : "bg-accent-subtle text-accent"}`}>{count > 99 ? "99+" : count}</span>}</Link>;
                        })}
                    </nav>
                </aside>
                <main className="page-enter min-w-0 px-5 py-8 lg:px-10 lg:py-10">
                    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                        <div className="app-heading"><h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">{description}</p></div>
                        {action}
                    </div>
                    {children}
                </main>
            </div>
        </div>
    );
}