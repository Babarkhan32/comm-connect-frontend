import type { LucideIcon } from "lucide-react";
import { Bike, BookOpen, CookingPot, Dumbbell, Gamepad2, HeartHandshake, Music2, Palette, PawPrint, Tag, Trees, UsersRound, Wrench } from "lucide-react";

const icons: Record<string, LucideIcon> = {
    Bike,
    BookOpen,
    CookingPot,
    Dumbbell,
    Gamepad2,
    HeartHandshake,
    Music2,
    Palette,
    PawPrint,
    Tag,
    Trees,
    UsersRound,
    Wrench,
};

const nameMatches: Array<[string, LucideIcon]> = [
    ["bike", Bike], ["cycling", Bike], ["book", BookOpen], ["read", BookOpen], ["cook", CookingPot], ["food", CookingPot], ["gym", Dumbbell], ["sport", Dumbbell], ["game", Gamepad2], ["music", Music2], ["art", Palette], ["paint", Palette], ["pet", PawPrint], ["dog", PawPrint], ["hike", Trees], ["outdoor", Trees], ["volunteer", HeartHandshake], ["help", HeartHandshake], ["community", UsersRound], ["repair", Wrench],
];

export function InterestIcon({ icon, name, className = "size-5" }: { icon?: string; name: string; className?: string }) {
    const matchedIcon = icon ? icons[icon] : undefined;
    const inferredIcon = nameMatches.find(([term]) => name.toLowerCase().includes(term))?.[1];
    const Icon = matchedIcon ?? inferredIcon ?? Tag;
    return <Icon className={className} aria-hidden="true" />;
}