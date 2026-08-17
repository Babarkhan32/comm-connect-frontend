import { AppShell } from "@/components/app-shell";
import { SearchWorkspace } from "@/components/search-workspace";

export default function EventSearchPage() {
    return <AppShell title="Search events" description="Find upcoming broadcasts by title, place, or keyword."><SearchWorkspace mode="events" /></AppShell>;
}
