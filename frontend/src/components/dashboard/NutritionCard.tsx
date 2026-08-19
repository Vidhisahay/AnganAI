import { Card } from "@/components/ui/card";
import { Coffee, UtensilsCrossed, Apple, Soup, Pill } from "lucide-react";
import type { AnalyzeChildResponse } from "@/api/anganApi";

type NutritionField = keyof AnalyzeChildResponse["nutrition"];

const meals: Array<{ icon: typeof Coffee; label: string; key: NutritionField; tint: string }> = [
  {
    icon: Coffee,
    label: "Breakfast",
    key: "breakfast",
    tint: "bg-warning/15 text-warning-foreground",
  },
  { icon: UtensilsCrossed, label: "Lunch", key: "lunch", tint: "bg-info/15 text-info" },
  { icon: Apple, label: "Evening Snack", key: "evening_snack", tint: "bg-success/15 text-success" },
  { icon: Soup, label: "Dinner", key: "dinner", tint: "bg-accent text-accent-foreground" },
  {
    icon: Pill,
    label: "Supplement",
    key: "supplement",
    tint: "bg-destructive/10 text-destructive",
  },
];

type NutritionCardProps = {
  nutrition: AnalyzeChildResponse["nutrition"] | null;
};

export function NutritionCard({ nutrition }: NutritionCardProps) {
  return (
    <Card className="p-6 shadow-[var(--shadow-card)] border-border/60">
      <div className="mb-5">
        <h2 className="font-semibold text-lg text-primary">Nutrition Plan</h2>
        <span className="text-sm text-muted-foreground">(Nutrition Agent)</span>
      </div>
      <div className="space-y-2">
        {meals.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.tint}`}>
              <m.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-sm text-muted-foreground truncate">
                {nutrition?.[m.key] ?? "Run an analysis to generate the nutrition plan."}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
