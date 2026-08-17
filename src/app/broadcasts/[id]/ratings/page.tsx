import { AppShell } from "@/components/app-shell";
import { BroadcastRatingWorkspace } from "@/components/broadcast-rating-workspace";

export default function BroadcastRatingsPage() {
    return <AppShell title="Rate your experience" description="Review the broadcast and the people who attended with you."><BroadcastRatingWorkspace /></AppShell>;
}
