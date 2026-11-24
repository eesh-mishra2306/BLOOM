import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";

export const MOOD_SCALE: { value: number; label: string; icon: LucideIcon }[] = [
  { value: 1, label: "Rough", icon: Frown },
  { value: 2, label: "Low", icon: Annoyed },
  { value: 3, label: "Okay", icon: Meh },
  { value: 4, label: "Good", icon: Smile },
  { value: 5, label: "Great", icon: Laugh },
];

export const moodLabel = (v: number) => MOOD_SCALE.find((m) => m.value === v)?.label ?? "";
export const MoodIcon = ({ value, className }: { value: number; className?: string }) => {
  const Icon = MOOD_SCALE.find((m) => m.value === value)?.icon ?? Meh;
  return <Icon aria-hidden className={className} />;
};
