"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Save, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import type { ResolvedAddress, User } from "@/lib/types";
import { AddressPicker } from "./address-picker";
import { Button, Field } from "./ui";

type UploadResponse = { uploadUrl: string; fileUrl: string; expiresIn: number; headers: Record<string, string> };

export function ProfileWorkspace() {
    const [user, setUser] = useState<User | null>(null);
    const [displayImageUrl, setDisplayImageUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [homeAddress, setHomeAddress] = useState<ResolvedAddress | null>(null);

    useEffect(() => {
        const refreshImage = () => Promise.all([api<User>("/users/me"), api<{ url: string | null }>("/users/me/profile-image/url")])
            .then(([profile, image]) => {
                setUser(profile);
                setDisplayImageUrl(image.url ?? profile.photoUrl ?? "");
                setHomeAddress(profile.address && profile.homeLocation ? {
                    address: profile.address,
                    postalCode: profile.postalCode ?? "",
                    state: "",
                    location: { lng: profile.homeLocation.coordinates[0], lat: profile.homeLocation.coordinates[1] },
                } : null);
            })
            .catch((reason: Error) => setError(reason.message));
        void refreshImage();
        const timer = window.setInterval(() => void refreshImage(), 14 * 60 * 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl("");
            return;
        }
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [selectedFile]);

    async function uploadProfileImage(file: File) {
        if (!user) return;
        setUploading(true);
        setError("");
        setSuccess("");
        try {
            const presigned = await api<UploadResponse>("/users/me/profile-image/presign", {
                method: "POST",
                body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size }),
            });
            let uploadResponse: Response;
            try {
                uploadResponse = await fetch(presigned.uploadUrl, {
                    method: "PUT",
                    headers: presigned.headers,
                    body: file,
                });
            } catch {
                throw new Error("The browser could not reach S3. Verify the bucket region, CORS origin, and that the frontend is running at http://localhost:3000.");
            }
            if (!uploadResponse.ok) {
                const details = await uploadResponse.text().catch(() => "");
                throw new Error(`S3 upload failed (${uploadResponse.status}). ${details.slice(0, 240) || "Check bucket permissions, region, and CORS configuration."}`);
            }
            const updated = await api<User>(`/users/${user._id}`, {
                method: "PATCH",
                body: JSON.stringify({ photoUrl: presigned.fileUrl }),
            });
            setUser(updated);
            setDisplayImageUrl(presigned.fileUrl);
            setSelectedFile(null);
            setSuccess("Profile picture updated.");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not upload your profile picture.");
        } finally {
            setUploading(false);
        }
    }

    async function submit(formData: FormData) {
        if (!user) return;
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            const updated = await api<User>(`/users/${user._id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    firstName: formData.get("firstName"),
                    lastName: formData.get("lastName"),
                    gender: formData.get("gender") || undefined,
                    postalCode: homeAddress?.postalCode || user.postalCode || undefined,
                    location: homeAddress ? { address: homeAddress.address, lng: homeAddress.location.lng, lat: homeAddress.location.lat } : undefined,
                }),
            });
            setUser(updated);
            setSuccess("Profile saved successfully.");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not save your profile.");
        } finally {
            setSaving(false);
        }
    }

    if (!user) return <div className="h-64 animate-pulse bg-surface-muted" />;
    const imageUrl = previewUrl || displayImageUrl || user.photoUrl;
    return <form action={submit} className="grid max-w-2xl gap-6">
        <section className="flex flex-wrap items-center justify-between gap-5 border border-border bg-surface p-5">
            <div className="flex items-center gap-4">
                <div className="grid size-16 place-items-center overflow-hidden rounded-full bg-accent-subtle text-accent">
                    {imageUrl ? <img src={imageUrl} alt={`${user.firstName} profile`} className="size-full object-cover" /> : <UserRound className="size-7" />}
                </div>
                <div><h2 className="font-semibold text-ink">{user.firstName} {user.lastName}</h2><p className="text-sm text-ink-muted">{user.email ?? user.phone}</p></div>
            </div>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 border border-border px-3 text-sm font-semibold text-ink-muted hover:border-accent hover:text-accent">
                <ImagePlus className="size-4" />Choose picture
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProfileImage(file); }} />
            </label>
        </section>
        {uploading && <p className="text-sm text-ink-muted">Uploading profile picture...</p>}
        <section className="grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2"><Field label="First name" name="firstName" defaultValue={user.firstName} required /><Field label="Last name" name="lastName" defaultValue={user.lastName} required /><label className="grid gap-1.5 text-sm font-medium text-ink">Date of birth<input type="date" value={user.dateOfBirth?.slice(0, 10) ?? ""} readOnly className="h-11 rounded-md border border-border bg-surface-muted px-3 text-ink-muted outline-none" /></label><label className="grid gap-1.5 text-sm font-medium text-ink">Gender<select name="gender" defaultValue={user.gender ?? ""} className="h-11 rounded-md border border-border bg-surface px-3 text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent-subtle/70"><option value="">Not specified</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></label></section>
        <section className="border border-border bg-surface p-5"><p className="mb-1 text-sm font-semibold text-ink">Home address</p><p className="mb-4 text-sm text-ink-muted">Private. Used only for nearby broadcast matching and never shown on your public profile.</p><AddressPicker label="Home address" value={homeAddress} onChange={setHomeAddress} /></section>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {success && <p role="status" className="text-sm font-medium text-success">{success}</p>}
        <Button loading={saving} type="submit" className="w-fit"><Save className="size-4" />Save profile</Button>
    </form>;
}
