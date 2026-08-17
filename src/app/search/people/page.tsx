import { AppShell } from "@/components/app-shell";
import { SearchWorkspace } from "@/components/search-workspace";

export default function PeopleSearchPage() {
    return <AppShell title="Search people" description="Find community members by name or email."><SearchWorkspace mode="people" /></AppShell>;
}
