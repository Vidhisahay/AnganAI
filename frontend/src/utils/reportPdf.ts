import { jsPDF } from "jspdf";
import type { AnalyzeChildResponse } from "@/api/anganApi";

const LEFT_MARGIN = 18;
const RIGHT_MARGIN = 18;
const TOP_MARGIN = 18;
const BOTTOM_MARGIN = 18;
const LABEL_LINE_HEIGHT = 5;
const BODY_LINE_HEIGHT = 5;
const FIELD_GAP = 3;

function safeFilename(name: string) {
  return name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "child";
}

export function downloadReportPdf(data: AnalyzeChildResponse) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - LEFT_MARGIN - RIGHT_MARGIN;
  let y = TOP_MARGIN;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - BOTTOM_MARGIN) return;
    pdf.addPage();
    y = TOP_MARGIN;
  };

  const section = (title: string) => {
    // Reserve space for the heading and the following field label so a section
    // heading is not left alone at the bottom of a page.
    ensureSpace(18);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setCharSpace(0);
    pdf.text(title, LEFT_MARGIN, y, { align: "left", charSpace: 0 });
    y += 7;
    pdf.setDrawColor(56, 91, 68);
    pdf.line(LEFT_MARGIN, y, pageWidth - RIGHT_MARGIN, y);
    y += 6;
  };

  const field = (label: string, value: string | number) => {
    const lines = pdf.splitTextToSize(String(value), contentWidth) as string[];
    ensureSpace(LABEL_LINE_HEIGHT + BODY_LINE_HEIGHT + FIELD_GAP);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setCharSpace(0);
    pdf.text(`${label}:`, LEFT_MARGIN, y, { align: "left", charSpace: 0 });
    y += LABEL_LINE_HEIGHT;

    pdf.setFont("helvetica", "normal");
    lines.forEach((line) => {
      ensureSpace(BODY_LINE_HEIGHT);
      pdf.setCharSpace(0);
      pdf.text(line, LEFT_MARGIN, y, { align: "left", charSpace: 0 });
      y += BODY_LINE_HEIGHT;
    });
    y += FIELD_GAP;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(56, 91, 68);
  pdf.setCharSpace(0);
  pdf.text("AnganAI", LEFT_MARGIN, y, { align: "left", charSpace: 0 });
  y += 8;
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Child Visit Report", LEFT_MARGIN, y, { align: "left", charSpace: 0 });
  y += 10;

  section("Child Information");
  field("Name", data.child_data.name);
  field("Age", `${data.child_data.age} years`);
  field("Gender", data.child_data.gender);
  field("Height", `${data.child_data.height} cm`);
  field("Weight", `${data.child_data.weight} kg`);
  field("MUAC", `${data.child_data.muac} cm`);

  section("AI Assessment");
  field("Growth Status", data.assessment.growth_status);
  field("Risk Level", data.assessment.risk_level);
  field("Summary", data.assessment.summary);
  field("Recommendation", data.assessment.recommendation);
  field("Follow-up", `${data.assessment.follow_up_days} days`);

  section("Nutrition Plan");
  field("Breakfast", data.nutrition.breakfast);
  field("Lunch", data.nutrition.lunch);
  field("Evening Snack", data.nutrition.evening_snack);
  field("Dinner", data.nutrition.dinner);
  field("Supplement", data.nutrition.supplement);

  section("Visit Report");
  field("Visit Summary", data.report.summary);
  field("Parent Advice", data.report.parent_advice);
  field("Worker Notes", data.report.worker_notes);

  pdf.save(`anganai-visit-report-${safeFilename(data.child_data.name)}.pdf`);
}
