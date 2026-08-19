import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ChildInfoCard } from "@/components/dashboard/ChildInfoCard";
import { AssessmentCard } from "@/components/dashboard/AssessmentCard";
import { NutritionCard } from "@/components/dashboard/NutritionCard";
import { GrowthChart } from "@/components/dashboard/GrowthChart";
import { VisitReportCard } from "@/components/dashboard/VisitReportCard";
import { analyzeChild, type AnalyzeChildResponse, type ChildFormValues } from "@/api/anganApi";

const initialFormValues: ChildFormValues = {
  name: "Rahul Kumar",
  age: "2",
  gender: "Male",
  height: "82",
  weight: "9",
  muac: "13.5",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AnganAI — AI Assistant for Anganwadi Workers" },
      {
        name: "description",
        content:
          "AnganAI is a dashboard-first AI assistant that helps Anganwadi workers assess child growth, nutrition, and generate reports.",
      },
      { property: "og:title", content: "AnganAI — AI Assistant for Anganwadi Workers" },
      {
        property: "og:description",
        content: "Assess child growth, nutrition, and reports with AnganAI.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [formValues, setFormValues] = useState<ChildFormValues>(initialFormValues);
  const [analysis, setAnalysis] = useState<AnalyzeChildResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (field: keyof ChildFormValues, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    if (error) {
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    const parsedRequest = {
      name: formValues.name.trim(),
      age: Number(formValues.age),
      gender: formValues.gender,
      height: Number(formValues.height),
      weight: Number(formValues.weight),
      muac: Number(formValues.muac),
    };

    if (
      !parsedRequest.name ||
      parsedRequest.gender.trim().length === 0 ||
      !Number.isFinite(parsedRequest.age) ||
      !Number.isFinite(parsedRequest.height) ||
      !Number.isFinite(parsedRequest.weight) ||
      !Number.isFinite(parsedRequest.muac)
    ) {
      setError("Please complete all fields with valid values before analyzing.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await analyzeChild(parsedRequest);
      setAnalysis(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
          <div className="px-4 md:px-8 py-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Enter child information to generate an assessment, nutrition plan, and visit report.
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">
          <main className="flex-1 min-w-0 space-y-6">
            {error ? (
              <div
                className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
                aria-live="polite"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <ChildInfoCard
              values={formValues}
              onFieldChange={handleFieldChange}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />
            <AssessmentCard assessment={analysis?.assessment ?? null} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NutritionCard nutrition={analysis?.nutrition ?? null} />
              <GrowthChart
                age={analysis?.child_data.age}
                gender={analysis?.child_data.gender}
                weight={analysis?.child_data.weight}
                childName={analysis?.child_data.name}
              />
            </div>
            <VisitReportCard
              analysis={analysis}
              childName={analysis?.child_data.name ?? formValues.name}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || "Unable to analyze the child. Please try again.";
  }

  return "Unable to analyze the child. Please try again.";
}
