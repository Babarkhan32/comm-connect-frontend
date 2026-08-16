"use client";

import { useEffect, useState } from "react";
import { Save, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { Button, Field } from "./ui";

export function ProfileWorkspace() {
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => { api<User>("/users/me").then(setUser).catch((reason: Error) => setError(reason.message)); }, []);
    async function submit(formData: FormData) { if (!user) return; setSaving(true); setError(""); try { const updated = await api<User>(`/users/${user._id}`, { method: "PATCH", body: JSON.stringify({ firstName: formData.get("firstName"), lastName: formData.get("lastName"), photoUrl: formData.get("photoUrl") || undefined, postalCode: formData.get("postalCode") || undefined }) }); setUser(updated); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save your profile."); } finally { setSaving(false); } }
    if (!user) return <div className="h-64 animate-pulse bg-surface-muted" />;
    return <form action={submit} className="grid max-w-2xl gap-6"><section className="flex items-center gap-4 border border-border bg-surface p-5"><div className="grid size-14 place-items-center rounded-full bg-accent-subtle text-accent"><UserRound className="size-7" /></div><div><h2 className="font-semibold text-ink">{user.firstName} {user.lastName}</h2><p className="text-sm text-ink-muted">{user.email ?? user.phone}</p></div></section><section className="grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2"><Field label="First name" name="firstName" defaultValue={user.firstName} required /><Field label="Last name" name="lastName" defaultValue={user.lastName} required /><Field label="Photo URL" name="photoUrl" type="url" defaultValue={user.photoUrl} /><Field label="Postal code" name="postalCode" defaultValue={user.postalCode} /></section>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button loading={saving} type="submit" className="w-fit"><Save className="size-4" />Save profile</Button></form>;
}