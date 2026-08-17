"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
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
  const [currentAddress, setCurrentAddress] = useState<ResolvedAddress | null>(
    null,
  );
  const [destination, setDestination] = useState<ResolvedAddress | null>(null);
  const [destinationToBeDecided, setDestinationToBeDecided] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [introVideoPreview, setIntroVideoPreview] = useState("");
  const titleWordCount = title.trim() ? title.trim().split(/\s+/).length : 0;

  useEffect(() => {
    getList<Interest>("/interests?limit=100")
      .then((result) => setInterests(result.data))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  useEffect(() => {
    if (!introVideo) {
      setIntroVideoPreview("");
      return;
    }
    const url = URL.createObjectURL(introVideo);
    setIntroVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [introVideo]);

  function toggleInterest(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((interestId) => interestId !== id)
        : [...current, id],
    );
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
  }

  async function submit(formData: FormData) {
    setError("");
    setSaving(true);
    try {
      const created = await api<{ broadcast: { _id: string } }>("/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          message,
          interestIds: selected,
          originAddress: currentAddress?.address,
          state: currentAddress?.state,
          postalCode: currentAddress?.postalCode,
          location: currentAddress?.location,
          destinationAddress: destinationToBeDecided
            ? undefined
            : destination?.address,
          destinationLocation: destinationToBeDecided
            ? undefined
            : destination?.location,
          destinationToBeDecided,
          radiusKm: Number(formData.get("radiusKm")),
          eventDate: new Date(String(formData.get("eventDate"))).toISOString(),
          maxParticipants: Number(formData.get("maxParticipants")),
        }),
      });
      for (const [index, file] of images.entries()) {
        const presigned = await api<{
          uploadUrl: string;
          objectKey: string;
          headers: Record<string, string>;
        }>(`/broadcasts/${created.broadcast._id}/images/presign`, {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
        });
        const upload = await fetch(presigned.uploadUrl, {
          method: "PUT",
          headers: presigned.headers,
          body: file,
        });
        if (!upload.ok) throw new Error("Could not upload a broadcast image.");
        await api(`/broadcasts/${created.broadcast._id}/images`, {
          method: "POST",
          body: JSON.stringify({
            objectKey: presigned.objectKey,
            makeCover: index === 0,
          }),
        });
      }
      if (introVideo) {
        const presigned = await api<{ uploadUrl: string; objectKey: string; headers: Record<string, string> }>(`/broadcasts/${created.broadcast._id}/video/presign`, {
          method: "POST",
          body: JSON.stringify({ fileName: introVideo.name, contentType: introVideo.type, fileSize: introVideo.size, videoKind: "intro" }),
        });
        const upload = await fetch(presigned.uploadUrl, { method: "PUT", headers: presigned.headers, body: introVideo });
        if (!upload.ok) throw new Error("Could not upload the broadcast intro video.");
        await api(`/broadcasts/${created.broadcast._id}/video`, { method: "POST", body: JSON.stringify({ objectKey: presigned.objectKey, videoKind: "intro" }) });
      }
      showToast("Broadcast published.", "success");
      router.push("/broadcasts");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not create your broadcast.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={submit} className="grid max-w-3xl gap-6">
      <Card className="grid gap-5 p-5">
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          Broadcast title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            className="h-11 rounded-md border border-border bg-surface px-3 text-ink shadow-sm outline-none placeholder:text-ink-muted focus:border-accent focus:ring-4 focus:ring-accent-subtle/70"
            placeholder="e.g. Saturday morning hiking"
          />
          <span
            className={`text-xs font-normal ${titleWordCount > 12 ? "text-danger" : "text-ink-muted"}`}
          >
            {titleWordCount}/12 words
          </span>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          What are you planning?
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            maxLength={1000}
            rows={4}
            className="resize-y rounded-md border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent focus:ring-4 focus:ring-accent-subtle/70"
            placeholder="Add the details people need to decide if they want to join."
          />
        </label>
        <Card className="grid gap-3 p-5">
          <div>
            <p className="text-sm font-semibold text-ink">Broadcast pictures <span className="font-normal text-ink-muted">(optional)</span></p>
            <p className="mt-1 text-sm text-ink-muted">Add photos related to this broadcast, such as the destination, activity, or shared interest.</p>
          </div>
          <label className="inline-flex w-fit cursor-pointer items-center border border-accent bg-accent-subtle px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent hover:text-surface">
            Choose broadcast pictures
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              aria-label="Optional broadcast pictures"
              aria-required="false"
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files ?? []);
                setImages((current) => [...current, ...selectedFiles]);
                event.currentTarget.value = "";
              }}
              className="sr-only"
            />
          </label>
          <p className="text-xs text-ink-muted">JPEG, PNG, or WebP, up to 10 MB each. The first image is used as the card thumbnail.</p>
          {imagePreviews.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{imagePreviews.map((preview, index) => <div key={preview} className="relative bg-surface-muted"><img src={preview} alt={`Broadcast picture ${index + 1}`} className="h-24 w-full object-contain object-top" /><button type="button" title="Remove picture" aria-label={`Remove broadcast picture ${index + 1}`} onClick={() => removeImage(index)} className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-danger text-surface shadow-sm hover:bg-danger/90"><X className="size-4" /></button>{index === 0 && <span className="absolute bottom-1 left-1 rounded bg-ink/85 px-1.5 py-1 text-[10px] font-semibold text-surface">Card thumbnail</span>}</div>)}</div>}
          {images.length > 0 && <p className="text-sm font-medium text-success">{images.length} picture{images.length === 1 ? "" : "s"} selected</p>}
        </Card>
        <Card className="grid gap-3 p-5">
          <div>
            <p className="text-sm font-semibold text-ink">Broadcast intro video <span className="font-normal text-ink-muted">(optional)</span></p>
            <p className="mt-1 text-sm text-ink-muted">Add one lightweight video to introduce the broadcast. It will appear in the upcoming feed.</p>
          </div>
          <label className="inline-flex w-fit cursor-pointer items-center border border-accent bg-accent-subtle px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent hover:text-surface">
            Choose intro video
            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { setIntroVideo(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} className="sr-only" />
          </label>
          <p className="text-xs text-ink-muted">MP4, WebM, or QuickTime, up to 50 MB. One video per broadcast.</p>
          {introVideoPreview && <div className="relative max-w-xl"><video controls preload="metadata" src={introVideoPreview} className="max-h-64 w-full rounded-md bg-black" /><button type="button" title="Remove selected intro video" onClick={() => setIntroVideo(null)} className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-danger text-surface hover:bg-danger/90"><X className="size-4" /></button></div>}
        </Card>
        <section className="border-t border-border pt-5">
          <p className="text-sm font-semibold text-ink">Current address</p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            This address is the centre of the radius used to find nearby people.
            It is not the activity destination.
          </p>
          <div className="mt-4">
            <AddressPicker
              label="Current address"
              value={currentAddress}
              onChange={setCurrentAddress}
              required
            />
          </div>
        </section>
        <section className="border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Destination</p>
              <p className="mt-1 text-sm text-ink-muted">
                Where the group is going or meeting.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={destinationToBeDecided}
                onChange={(event) => {
                  setDestinationToBeDecided(event.target.checked);
                  if (event.target.checked) setDestination(null);
                }}
                className="size-4 accent-[var(--accent)]"
              />
              To be decided
            </label>
          </div>
          {!destinationToBeDecided && (
            <div className="mt-4">
              <AddressPicker
                label="Destination address"
                value={destination}
                onChange={setDestination}
                required
              />
            </div>
          )}
        </section>
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Who is it for?</p>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <button
                key={interest._id}
                type="button"
                onClick={() => toggleInterest(interest._id)}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${selected.includes(interest._id) ? "border-accent bg-accent-subtle text-accent" : "border-border text-ink-muted hover:border-accent"}`}
              >
                {interest.name}
              </button>
            ))}
          </div>
        </div>
      </Card>
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field
          label="Date and time"
          name="eventDate"
          type="datetime-local"
          required
        />
        <Field
          label="Maximum participants"
          name="maxParticipants"
          type="number"
          min="1"
          max="100"
          defaultValue="6"
          required
        />
        <Field
          label="Reach (km)"
          name="radiusKm"
          type="number"
          min="1"
          max="100"
          defaultValue="10"
          required
        />
      </Card>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button
          loading={saving}
          disabled={
            !selected.length ||
            !message.trim() ||
            !title.trim() ||
            titleWordCount > 12 ||
            !currentAddress ||
            (!destinationToBeDecided && !destination)
          }
          type="submit"
        >
          <Plus className="size-4" />
          Publish broadcast
        </Button>
        <Link
          href="/broadcasts"
          className="inline-flex h-11 items-center px-3 text-sm font-semibold text-ink-muted"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
