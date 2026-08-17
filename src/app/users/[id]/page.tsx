import { AppShell } from "@/components/app-shell";
import { UserProfileWorkspace } from "@/components/user-profile-workspace";

export default function UserPage() {
    return <AppShell title="Community profile" description="See a member's attended events, ratings, and safety controls."><UserProfileWorkspace /></AppShell>;
}
