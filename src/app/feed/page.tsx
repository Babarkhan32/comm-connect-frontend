import { AppShell } from "@/components/app-shell";
import { FeedWorkspace } from "@/components/feed-workspace";

export default function FeedPage() {
    return <AppShell title="Feed" description="Discover upcoming broadcasts and relive past event highlights."><FeedWorkspace /></AppShell>;
}
