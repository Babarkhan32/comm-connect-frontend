"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, getList } from "@/lib/api";
import type { Interest, ResolvedAddress } from "@/lib/types";
import { AddressPicker } from "./address-picker";
import { showToast } from "./toast";
import { Button, Card, Field } from "./ui";

export function BroadcastForm() {
    const router = useRouter();
    const [interests, setInterests] = useState<Interest[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [currentAddress, setCurrentAddress] = useState<ResolvedAddress | null>(null);
    const [destination, setDestination] = useState<ResolvedAddress | null>(null);
    const [destinationToBeDecided, setDestinationToBeDecided] = useState(false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const titleWordCount = title.trim() ? title.trim().split(/\s+/).length : 0;

    useEffect(() => {
        getList<Interest>("/interests?limit=100")
            .then((result) => setInterests(result.data))
            .catch((reason: Error) => setError(reason.message));
    }, []);

    function toggleInterest(id: string) {
        setSelected((current) => current.includes(id) ? current.filter((interestId) => interestId !== id) : [...current, id]);
    }

    async function submit(formData: FormData) {
        setError("");
        setSaving(true);
        try {
            await api("/broadcasts", {
                method: "POST",
                body: JSON.stringify({
                    title: title.trim(),
                    message,
                    interestIds: selected,
                    originAddress: currentAddress?.address,
                    state: currentAddress?.state,
                    postalCode: currentAddress?.postalCode,
                    location: currentAddress?.location,
                    destinationAddress: destinationToBeDecided ? undefined : destination?.address,
                    destinationLocation: destinationToBeDecided ? undefined : destination?.location,
                    destinationToBeDecided,
                    radiusKm: Number(formData.get("radiusKm")),
                    eventDate: new Date(String(formData.get("eventDate"))).toISOString(),
                    maxParticipants: Number(formData.get("maxParticipants")),
                }),
            });
            showToast("Broadcast published.", "success");
            router.push("/broadcasts");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not create your broadcast.");
        } finally {
            setSaving(false);
        }
    }

    return <form action={submit} className="grid max-w-3xl gap-6"><Card className="grid gap-5 p-5"><label className="grid gap-1.5 text-sm font-medium text-ink">Broadcast title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required className="h-11 rounded-md border border-border bg-surface px-3 text-ink shadow-sm outline-none placeholder:text-ink-muted focus:border-accent focus:ring-4 focus:ring-accent-subtle/70" placeholder="e.g. Saturday morning hiking" /><span className={`text-xs font-normal ${titleWordCount > 12 ? "text-danger" : "text-ink-muted"}`}>{titleWordCount}/12 words</span></label><label className="grid gap-1.5 text-sm font-medium text-ink">What are you planning?<textarea value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={1000} rows={4} className="resize-y rounded-md border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent focus:ring-4 focus:ring-accent-subtle/70" placeholder="Add the details people need to decide if they want to join." /></label><section className="border-t border-border pt-5"><p className="text-sm font-semibold text-ink">Current address</p><p className="mt-1 text-sm leading-6 text-ink-muted">This address is the centre of the radius used to find nearby people. It is not the activity destination.</p><div className="mt-4"><AddressPicker label="Current address" value={currentAddress} onChange={setCurrentAddress} required /></div></section><section className="border-t border-border pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-ink">Destination</p><p className="mt-1 text-sm text-ink-muted">Where the group is going or meeting.</p></div><label className="inline-flex items-center gap-2 text-sm font-medium text-ink"><input type="checkbox" checked={destinationToBeDecided} onChange={(event) => { setDestinationToBeDecided(event.target.checked); if (event.target.checked) setDestination(null); }} className="size-4 accent-[var(--accent)]" />To be decided</label></div>{!destinationToBeDecided && <div className="mt-4"><AddressPicker label="Destination address" value={destination} onChange={setDestination} required /></div>}</section><div><p className="mb-2 text-sm font-medium text-ink">Who is it for?</p><div className="flex flex-wrap gap-2">{interests.map((interest) => <button key={interest._id} type="button" onClick={() => toggleInterest(interest._id)} className={`rounded-md border px-3 py-2 text-sm font-medium ${selected.includes(interest._id) ? "border-accent bg-accent-subtle text-accent" : "border-border text-ink-muted hover:border-accent"}`}>{interest.name}</button>)}</div></div></Card><Card className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Date and time" name="eventDate" type="datetime-local" required /><Field label="Maximum participants" name="maxParticipants" type="number" min="1" max="100" defaultValue="6" required /><Field label="Reach (km)" name="radiusKm" type="number" min="1" max="100" defaultValue="10" required /></Card>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex gap-3"><Button loading={saving} disabled={!selected.length || !message.trim() || !title.trim() || titleWordCount > 12 || !currentAddress || (!destinationToBeDecided && !destination)} type="submit"><Plus className="size-4" />Publish broadcast</Button><Link href="/broadcasts" className="inline-flex h-11 items-center px-3 text-sm font-semibold text-ink-muted">Cancel</Link></div></form>;
}