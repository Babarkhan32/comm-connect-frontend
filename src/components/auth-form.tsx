"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, UsersRound } from "lucide-react";
import { api, getSession, saveSession } from "@/lib/api";
import type { ResolvedAddress, User } from "@/lib/types";
import { AddressPicker } from "./address-picker";
import { showToast } from "./toast";
import { Button, Field } from "./ui";

type AuthResponse = { accessToken: string; refreshToken: string; user: User };

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [address, setAddress] = useState<ResolvedAddress | null>(null);
    const isSignup = mode === "signup";

    useEffect(() => {
        if (getSession()) {
            router.replace("/broadcasts");
            return;
        }
        setCheckingSession(false);
    }, [router]);

    async function submit(formData: FormData) {
        setError("");
        setLoading(true);
        try {
            const body = isSignup
                ? { firstName: formData.get("firstName"), lastName: formData.get("lastName"), dateOfBirth: formData.get("dateOfBirth"), gender: formData.get("gender"), email: formData.get("email"), password: formData.get("password"), postalCode: address?.postalCode, location: address ? { address: address.address, lng: address.location.lng, lat: address.location.lat } : undefined }
                : { email: formData.get("email"), password: formData.get("password") };
            const response = await api<AuthResponse>(isSignup ? "/users" : "/auth/login", { method: "POST", body: JSON.stringify(body) });
            if (isSignup) {
                showToast("Account created. Kindly login", "success");
                //  router.push(`/verify-email?email=${encodeURIComponent(String(formData.get("email")))}`);
                router.push('/login')
                return;
            }
            saveSession(response);
            showToast("Welcome back.", "success");
            router.replace(response.user.interestIds?.length ? "/broadcasts" : "/onboarding/interests");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to continue.");
        } finally { setLoading(false); }
    }

    if (checkingSession) return null;

    return (
        <main className="grid min-h-screen bg-canvas lg:grid-cols-[1fr_0.9fr]">
            <section className="hidden bg-ink px-12 py-14 text-surface lg:flex lg:flex-col lg:justify-between">
                <div className="inline-flex items-center gap-2 text-lg font-bold"><UsersRound className="size-6 text-accent-subtle" />Comm Connect</div>
                <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent-subtle">Your local circle</p><h1 className="mt-4 max-w-md text-5xl font-bold leading-tight">Make plans that turn neighbours into friends.</h1><p className="mt-6 max-w-md leading-7 text-surface/70">Find the people who share your interests, and create moments worth showing up for.</p></div>
                <p className="text-sm text-surface/50">Small groups. Genuine connection.</p>
            </section>
            <section className="grid place-items-center px-5 py-12">
                <div className="w-full max-w-md">
                    <Link href="/" className="mb-12 inline-flex items-center gap-2 text-lg font-bold text-ink lg:hidden"><UsersRound className="size-6 text-accent" />Comm Connect</Link>
                    <p className="text-sm font-medium text-accent">{isSignup ? "Create your account" : "Welcome back"}</p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">{isSignup ? "Start connecting nearby" : "Sign in to your community"}</h2>
                    <form action={submit} className="mt-8 grid gap-4">
                        {isSignup && <div className="grid gap-4 sm:grid-cols-2"><Field label="First name" name="firstName" autoComplete="given-name" required /><Field label="Last name" name="lastName" autoComplete="family-name" required /></div>}
                        {isSignup && <div className="grid gap-4 sm:grid-cols-2"><Field label="Date of birth" name="dateOfBirth" type="date" required /><label className="grid gap-1.5 text-sm font-medium text-ink">Gender<select name="gender" required defaultValue="" className="h-11 rounded-md border border-border bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent-subtle/70"><option value="" disabled>Select gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></label></div>}
                        <Field label="Email address" name="email" type="email" autoComplete="email" required />
                        {isSignup && <AddressPicker value={address} onChange={setAddress} />}
                        <div className="grid gap-1.5"><Field label="Password" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} hint={isSignup ? "Use at least 8 characters." : undefined} required minLength={8} />
                            {!isSignup && <Link href="/forgot-password" className="justify-self-end text-sm font-semibold text-accent hover:text-accent-hover">Forgot password?</Link>}
                        </div>
                        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
                        <Button loading={loading} type="submit">{isSignup ? "Create account" : "Sign in"}<ArrowRight className="size-4" /></Button>
                    </form>
                    <p className="mt-6 text-sm text-ink-muted">{isSignup ? "Already have an account?" : "New to Comm Connect?"} <Link className="font-semibold text-accent hover:text-accent-hover" href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link></p>
                </div>
            </section>
        </main>
    );
}