import { AppShell } from "@/components/app-shell";
import { redirect } from "next/navigation";

export default function SearchPage() {
    redirect("/search/people");
}
