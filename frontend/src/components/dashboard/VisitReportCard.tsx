import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import type { AnalyzeChildResponse } from "@/api/anganApi";
import { downloadReportPdf } from "@/utils/reportPdf";

type VisitReportCardProps = {
  analysis: AnalyzeChildResponse | null;
  childName: string;
};

export function VisitReportCard({ analysis, childName }: VisitReportCardProps) {
  const report = analysis?.report ?? null;
  const assessment = analysis?.assessment ?? null;
  const growthStatus = assessment?.growth_status ?? "Waiting for analysis";
  const riskLevel = assessment?.risk_level ?? "Waiting for analysis";
  const followUpDays = assessment?.follow_up_days;

  return (
    <Card className="p-6 shadow-[var(--shadow-card)] border-border/60">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shrink-0">
          <FileText className="w-7 h-7 text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-primary">Report</span>
            <span className="text-sm text-muted-foreground">(Report Agent)</span>
          </div>
          <div className="font-semibold text-lg">Today's Visit Summary</div>
          <div className="text-sm text-muted-foreground mb-3">
            Assessment completed for {childName}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
            <div>
              <div className="text-xs text-muted-foreground">Visit Summary</div>
              <div>{report?.summary ?? "Run an analysis to generate the visit summary."}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Parent Advice</div>
              <div>{report?.parent_advice ?? "Run an analysis to show parent advice."}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Worker Notes</div>
              <div>{report?.worker_notes ?? "Run an analysis to show worker notes."}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-success/10 text-success border-0">
              Growth: {growthStatus}
            </Badge>
            <Badge variant="secondary" className="bg-info/10 text-info border-0">
              Risk: {riskLevel}
            </Badge>
            <Badge variant="secondary" className="bg-accent text-accent-foreground border-0">
              Report: {report ? "Generated" : "Waiting"}
            </Badge>
            <Badge variant="secondary" className="bg-warning/15 text-warning-foreground border-0">
              Follow-up: {followUpDays ?? "--"} days
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button
            className="gap-2 shadow-sm"
            disabled={!analysis}
            onClick={() => analysis && downloadReportPdf(analysis)}
          >
            <Download className="w-4 h-4" /> Download Report
          </Button>
        </div>
      </div>
    </Card>
  );
}
