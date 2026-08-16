"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Field } from "./ui";

export function PasswordRecovery() {
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function submit(formData: FormData) { setLoading(true); setError(""); try { await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: formData.get("email") }) }); setMessage("Check your inbox for a link to reset your password."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not request a reset link."); } finally { setLoading(false); } }
    return <main className="grid min-h-screen place-items-center bg-canvas px-5 py-12"><section className="w-full max-w-md border border-border bg-surface p-7 sm:p-9"><div className="grid size-11 place-items-center rounded-full bg-accent-subtle text-accent"><Mail className="size-5" /></div><p className="mt-6 text-sm font-semibold text-accent">Account recovery</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Reset your password</h1><p className="mt-3 text-sm leading-6 text-ink-muted">Enter your account email and we will send the next step.</p><form action={submit} className="mt-7 grid gap-4"><Field label="Email address" name="email" type="email" autoComplete="email" required />{error && <p role="alert" className="text-sm text-danger">{error}</p>}{message && <p role="status" className="text-sm text-success">{message}</p>}<Button loading={loading} type="submit">Send reset link<ArrowRight className="size-4" /></Button></form><p className="mt-6 text-sm text-ink-muted"><Link href="/login" className="font-semibold text-accent hover:text-accent-hover">Back to sign in</Link></p></section></main>;
}