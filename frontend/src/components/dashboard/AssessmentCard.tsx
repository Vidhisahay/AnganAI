import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Info, Sparkles } from "lucide-react";
import type { AnalyzeChildResponse } from "@/api/anganApi";

type AssessmentCardProps = {
  assessment: AnalyzeChildResponse["assessment"] | null;
};

function getAssessmentTone(value: string) {
  const normalizedValue = value.toLowerCase();

  if (normalizedValue.includes("normal") || normalizedValue.includes("low")) {
    return "bg-success text-success-foreground hover:bg-success";
  }

  if (
    normalizedValue.includes("moderate") ||
    normalizedValue.includes("risk") ||
    normalizedValue.includes("watch")
  ) {
    return "bg-warning text-warning-foreground hover:bg-warning";
  }

  if (normalizedValue.includes("high") || normalizedValue.includes("severe")) {
    return "bg-destructive text-destructive-foreground hover:bg-destructive";
  }

  return "bg-secondary text-secondary-foreground hover:bg-secondary";
}

export function AssessmentCard({ assessment }: AssessmentCardProps) {
  return (
    <Card className="p-6 shadow-[var(--shadow-card)] border-border/60">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-accent-foreground" />
        </div>
        <h2 className="font-semibold text-lg text-primary">AI Assessment</h2>
        <span className="text-sm text-muted-foreground">(Child Analysis Agent)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
          <div className="text-xs text-muted-foreground mb-1">Growth Status</div>
          <Badge
            className={
              assessment
                ? getAssessmentTone(assessment.growth_status)
                : "bg-secondary text-secondary-foreground hover:bg-secondary"
            }
          >
            {assessment?.growth_status ?? "Waiting for analysis"}
          </Badge>
        </div>
        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
          <div className="text-xs text-muted-foreground mb-1">Risk Level</div>
          <Badge
            className={
              assessment
                ? getAssessmentTone(assessment.risk_level)
                : "bg-secondary text-secondary-foreground hover:bg-secondary"
            }
          >
            {assessment?.risk_level ?? "Waiting for analysis"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium mb-1">Summary</div>
            <p className="text-sm text-muted-foreground">
              {assessment?.summary ?? "Run an analysis to see the assessment summary."}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium mb-1">Recommendation</div>
            <p className="text-sm text-muted-foreground">
              {assessment?.recommendation ?? "Run an analysis to see the recommendation."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/20 text-sm">
        <Info className="w-4 h-4 text-info" />
        <span className="text-muted-foreground">
          Next follow-up recommended in{" "}
          <span className="font-semibold text-info">{assessment?.follow_up_days ?? "--"} days</span>
        </span>
      </div>
    </Card>
  );
}
