import type { ComponentPropsWithoutRef, ElementType, InputHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type CardProps<T extends ElementType> = {
    as?: T;
    children: ReactNode;
    className?: string;
    interactive?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Card<T extends ElementType = "div">({ as, children, className = "", interactive = false, ...props }: CardProps<T>) {
    const Component = as ?? "div";
    return <Component className={`rounded-lg border border-border bg-surface shadow-sm ${interactive ? "transition-all hover:-translate-y-1 hover:border-accent hover:shadow-md" : ""} ${className}`} {...props}>{children}</Component>;
}

export function Button({ className = "", loading, children, ...props }: ComponentPropsWithoutRef<"button"> & { loading?: boolean }) {
    return (
        <button
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-surface shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
            {children}
        </button>
    );
}

export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
    return (
        <label className="grid gap-1.5 text-sm font-medium text-ink">
            {label}
            <input
                className="h-11 rounded-md border border-border bg-surface px-3 text-ink shadow-sm outline-none placeholder:text-ink-muted transition-shadow focus:border-accent focus:ring-4 focus:ring-accent-subtle/70"
                {...props}
            />
            {hint && <span className="text-xs font-normal text-ink-muted">{hint}</span>}
        </label>
    );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <Card className="grid min-h-56 place-items-center border-dashed bg-surface/80 p-8 text-center">
            <div>
                <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-accent-subtle text-accent">{icon}</div>
                <h2 className="font-semibold text-ink">{title}</h2>
                <p className="mt-1 max-w-sm text-sm leading-6 text-ink-muted">{children}</p>
            </div>
        </Card>
    );
}