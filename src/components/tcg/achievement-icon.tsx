import {
  Trophy, Coins, Layers, Library, BookOpen, ShieldCheck, Swords, Flame, Crown,
  Star, Sparkles, CalendarCheck, Medal, Package, LogIn, Target,
} from "lucide-react";

const MAP: Record<string, typeof Trophy> = {
  Trophy, Coins, Layers, Library, BookOpen, ShieldCheck, Swords, Flame, Crown,
  Star, Sparkles, CalendarCheck, Medal, Package, LogIn, Target,
};

export function AchievementIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && MAP[name]) || Target;
  return <Icon className={className} />;
}
