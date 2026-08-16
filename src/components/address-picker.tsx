"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { api } from "@/lib/api";
import type { ResolvedAddress } from "@/lib/types";

type Suggestion = { placeId: string; description: string };

export function AddressPicker({ value, onChange, required = false, label = "Address" }: { value: ResolvedAddress | null; onChange: (address: ResolvedAddress | null) => void; required?: boolean; label?: string }) {
    const [query, setQuery] = useState(value?.address ?? "");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (query.trim().length < 3 || query === value?.address) { setSuggestions([]); return; }
        const timeout = window.setTimeout(() => {
            setLoading(true);
            api<{ data: Suggestion[] }>(`/locations/autocomplete?query=${encodeURIComponent(query)}`)
                .then((result) => setSuggestions(result.data ?? []))
                .catch((reason: Error) => setError(reason.message))
                .finally(() => setLoading(false));
        }, 1000);
        return () => window.clearTimeout(timeout);
    }, [query, value?.address]);

    async function choose(suggestion: Suggestion) {
        setLoading(true);
        setError("");
        try {
            const resolved = await api<ResolvedAddress>(`/locations/${encodeURIComponent(suggestion.placeId)}`);
            setQuery(resolved.address);
            setSuggestions([]);
            onChange(resolved);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not resolve this address.");
        } finally { setLoading(false); }
    }

    return <div className="relative grid gap-1.5"><label className="text-sm font-medium text-ink">{label}<input value={query} onChange={(event) => { setQuery(event.target.value); onChange(null); }} required={required} autoComplete="street-address" placeholder="Start typing an address" className="mt-1.5 h-11 w-full rounded-md border border-border bg-surface px-3 text-ink shadow-sm outline-none placeholder:text-ink-muted focus:border-accent focus:ring-4 focus:ring-accent-subtle/70" /></label>{loading && <span className="text-xs text-ink-muted">Searching addresses...</span>}{suggestions.length > 0 && <div className="absolute top-[5.1rem] z-20 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg">{suggestions.map((suggestion) => <button key={suggestion.placeId} type="button" onClick={() => void choose(suggestion)} className="flex w-full items-start gap-2 border-b border-border px-3 py-3 text-left text-sm text-ink last:border-0 hover:bg-surface-muted"><MapPin className="mt-0.5 size-4 shrink-0 text-accent" />{suggestion.description}</button>)}</div>}{value && <p className="text-xs text-success">Location selected: {value.postalCode || value.state || value.address}</p>}{error && <p role="alert" className="text-xs text-danger">{error}</p>}</div>;
}