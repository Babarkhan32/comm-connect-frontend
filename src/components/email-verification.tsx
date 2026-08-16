"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Field } from "./ui";

export function EmailVerification() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";
    const [status, setStatus] = useState(email ? "Sending a verification code..." : "Enter the email address used to create your account.");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(Boolean(email));

    async function sendCode(address = email) {
        if (!address) return;
        setLoading(true);
        setError("");
        try {
            await api("/auth/verify-email/send", { method: "POST", body: JSON.stringify({ email: address }) });
            setStatus(`A verification code has been sent to ${address}.`);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not send a verification code.");
            setStatus("Request another code once the issue is resolved.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { if (email) void sendCode(); }, [email]);

    async function verify(formData: FormData) {
        const address = String(formData.get("email"));
        setLoading(true);
        setError("");
        try {
            await api("/auth/verify-email", { method: "POST", body: JSON.stringify({ email: address, code: formData.get("code") }) });
            setStatus("Your email is verified. You can now sign in.");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "We could not verify that code.");
        } finally {
            setLoading(false);
        }
    }

    return <main className="grid min-h-screen place-items-center bg-canvas px-5 py-12"><section className="w-full max-w-md border border-border bg-surface p-7 sm:p-9"><div className="grid size-11 place-items-center rounded-full bg-accent-subtle text-accent"><Mail className="size-5" /></div><p className="mt-6 text-sm font-semibold text-accent">One last step</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Verify your email</h1><p className="mt-3 text-sm leading-6 text-ink-muted">{status}</p><form action={verify} className="mt-7 grid gap-4"><Field label="Email address" name="email" type="email" defaultValue={email} required /><Field label="Verification code" name="code" inputMode="numeric" autoComplete="one-time-code" required />{error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button loading={loading} type="submit"><CheckCircle2 className="size-4" />Verify email</Button></form><button onClick={() => void sendCode()} disabled={loading || !email} className="mt-5 text-sm font-semibold text-accent hover:text-accent-hover disabled:opacity-50">Send another code</button><p className="mt-6 text-sm text-ink-muted">Already verified? <Link href="/login" className="font-semibold text-accent hover:text-accent-hover">Sign in</Link></p></section></main>;
}