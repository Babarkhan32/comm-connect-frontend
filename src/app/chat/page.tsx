import { AppShell } from "@/components/app-shell";
import { ChatWorkspace } from "@/components/realtime-workspaces";

export default function ChatPage() { return <AppShell title="Messages" description="Coordinate the details with people who joined your plans."><ChatWorkspace /></AppShell>; }