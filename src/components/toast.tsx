"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

type Toast = { id: string; message: string; variant: ToastVariant };
type ToastEvent = { message: string; variant: ToastVariant };

const toastEventName = "comm-connect:toast";

export function showToast(message: string, variant: ToastVariant = "info") {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent<ToastEvent>(toastEventName, { detail: { message, variant } }));
}

const toastStyles = {
    success: { icon: CheckCircle2, color: "text-success", label: "Success" },
    error: { icon: CircleAlert, color: "text-danger", label: "Error" },
    info: { icon: Info, color: "text-accent", label: "Notice" },
};

export function ToastViewport() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        function onToast(event: Event) {
            const detail = (event as CustomEvent<ToastEvent>).detail;
            if (!detail?.message) return;
            const id = `${Date.now()}-${Math.random()}`;
            setToasts((current) => [...current, { id, ...detail }].slice(-4));
            window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5000);
        }

        window.addEventListener(toastEventName, onToast);
        return () => window.removeEventListener(toastEventName, onToast);
    }, []);

    return <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-3" aria-live="polite">{toasts.map((toast) => {
        const { icon: Icon, color, label } = toastStyles[toast.variant];
        return <div key={toast.id} className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-lg"><Icon className={`mt-0.5 size-5 shrink-0 ${color}`} aria-hidden="true" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p><p className="mt-1 text-sm leading-5 text-ink">{toast.message}</p></div><button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="grid size-7 place-items-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink" aria-label="Dismiss notification"><X className="size-4" /></button></div>;
    })}</div>;
}