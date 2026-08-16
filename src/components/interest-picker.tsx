"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Tags } from "lucide-react";
import { api, getList } from "@/lib/api";
import type { Interest, User } from "@/lib/types";
import { InterestIcon } from "./interest-icon";
import { showToast } from "./toast";
import { Button, Card, EmptyState } from "./ui";

function InterestChoice({ interest, selected, onToggle }: { interest: Interest; selected: boolean; onToggle: (id: string) => void }) {
    return (
        <Card as="button" type="button" aria-pressed={selected} onClick={() => onToggle(interest._id)} interactive className={`flex min-h-24 items-center gap-3 p-4 text-left text-sm font-semibold ${selected ? "!border-accent !bg-accent !text-surface" : "text-ink"}`}>
            <span className={`grid size-9 shrink-0 place-items-center rounded-md ${selected ? "bg-surface/20 text-surface" : "bg-surface-muted text-accent"}`}>
                <InterestIcon icon={interest.icon} name={interest.name} className="size-4" />
            </span>
            <span className="min-w-0 flex-1 capitalize">{interest.name}</span>
            {selected && <Check className="size-4 shrink-0" />}
        </Card>
    );
}

export function InterestPicker() {
    const router = useRouter();
    const [interests, setInterests] = useState<Interest[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([getList<Interest>("/interests?limit=100"), api<User>("/users/me")])
            .then(([interestResult, user]) => {
                setInterests(interestResult.data);
                setSelected(Array.isArray(user.interestIds) ? user.interestIds.map(String) : []);
            })
            .catch((reason: Error) => setError(reason.message))
            .finally(() => setLoading(false));
    }, []);
    function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
    async function save() { setSaving(true); setError(""); try { await api("/users/me/interests", { method: "PATCH", body: JSON.stringify({ interestIds: selected }) }); showToast("Your interests have been updated.", "success"); router.push("/"); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save your interests."); } finally { setSaving(false); } }

    if (!loading && !interests.length) return <EmptyState icon={<Tags className="size-5" />} title="No interests are available yet">Ask an administrator to add interest tags, then return here to make your selection.</EmptyState>;
    return <div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{loading ? Array.from({ length: 9 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-surface-muted" />) : interests.map((interest) => <InterestChoice key={interest._id} interest={interest} selected={selected.includes(interest._id)} onToggle={toggle} />)}</div>{error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}<div className="mt-7 flex items-center justify-between gap-4"><p className="text-sm text-ink-muted">{selected.length} selected</p><Button onClick={save} loading={saving} disabled={!selected.length}>Save interests</Button></div></div>;
}