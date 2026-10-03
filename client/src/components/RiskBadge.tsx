import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const styles = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  medium: "border-violet-200 bg-violet-50 text-violet-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function RiskBadge({ level }: { level: keyof typeof styles }) {
  return (
    <Badge variant="outline" className={cn("capitalize", styles[level])}>
      {level}
    </Badge>
  );
}
