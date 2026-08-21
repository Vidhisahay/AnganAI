import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  whoWeightForAgeBoys,
  whoWeightForAgeGirls,
  type WhoWeightForAgePoint,
} from "@/data/whoWeightForAge";

import anganApi from "@/api/anganApi";

interface GrowthChartProps {
  age?: number;
  gender?: string;
  weight?: number;
  childName?: string;
  childCode?: string;
  childId?: number;
}

interface AssessmentHistory {
  id: number;
  age: number;
  height: number;
  weight: number;
  muac?: number | null;
  growth_status?: string | null;
  risk_level?: string | null;
  created_at: string;
}

interface ChildHistoryResponse {
  child_id: number;
  child_code: string;
  child_name: string;
  assessments: AssessmentHistory[];
}

type ChartPoint = WhoWeightForAgePoint & {
  childWeight?: number;
};

interface ChildTrendPoint {
  date: string;
  dateLabel: string;
  age: number;
  weight: number;
  height: number;
  muac?: number | null;
  assessmentId: number;
}

const formatKilograms = (value: number) => `${value.toFixed(1)} kg`;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const formatAge = (age: number) => {
  if (!Number.isFinite(age)) {
    return "—";
  }

  if (age === 0) {
    return "0 years";
  }

  if (Number.isInteger(age)) {
    return `${age} year${age === 1 ? "" : "s"}`;
  }

  return `${age.toFixed(1)} years`;
};

export function GrowthChart({
  age,
  gender,
  weight,
  childCode,
  childId,
}: GrowthChartProps) {
  const [history, setHistory] = useState<AssessmentHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  /*
   * Fetch assessment history whenever the selected child changes.
   *
   * Child code is preferred because it is the stable public identifier.
   * Numeric child ID is retained as a backward-compatible fallback.
   */
  useEffect(() => {
    const childIdentifier = childCode?.trim() || childId?.toString();

    if (!childIdentifier) {
      setHistory([]);
      setHistoryError(null);
      return;
    }

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError(null);

        const response = await anganApi.get<ChildHistoryResponse>(
          `/children/${childIdentifier}/history`,
        );

        const data = response.data;

        setHistory(data.assessments ?? []);
      } catch (error) {
        console.error("Failed to load assessment history:", error);

        setHistory([]);
        setHistoryError("Unable to load assessment history.");
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [childCode, childId]);

  /*
   * Normalize gender for selecting the correct WHO reference dataset.
   */
  const normalizedGender = gender?.trim().toLowerCase() ?? "";

  /*
   * Current child's age expressed in months.
   *
   * This is used only for the WHO reference chart / fallback.
   */
  const ageInMonths = Math.floor((age ?? Number.NaN) * 12);

  /*
   * Select the appropriate WHO reference dataset.
   */
  const referenceData =
    normalizedGender === "male"
      ? whoWeightForAgeBoys
      : whoWeightForAgeGirls;

  /*
   * Build the child's actual historical trend.
   *
   * IMPORTANT:
   * We intentionally DO NOT group assessments by age/month.
   *
   * A child can have multiple assessments at the same age:
   *
   *   Assessment 1 → age 2 → 9.0 kg
   *   Assessment 2 → age 2 → 9.5 kg
   *   Assessment 3 → age 2 → 10.0 kg
   *
   * All three measurements must remain visible.
   *
   * The X-axis therefore represents assessment date/order,
   * while the tooltip shows the child's age.
   */
  const childTrendData: ChildTrendPoint[] = useMemo(() => {
    return [...history]
      .filter(
        (assessment) =>
          Number.isFinite(assessment.age) &&
          Number.isFinite(assessment.weight) &&
          Number.isFinite(new Date(assessment.created_at).getTime()),
      )
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime(),
      )
      .map((assessment) => ({
        date: assessment.created_at,
        dateLabel: formatDate(assessment.created_at),
        age: assessment.age,
        weight: assessment.weight,
        height: assessment.height,
        muac: assessment.muac,
        assessmentId: assessment.id,
      }));
  }, [history]);

  /*
   * Determine whether PostgreSQL returned historical data.
   */
  const hasHistoricalData = childTrendData.length > 0;

  /*
   * WHO reference data.
   *
   * The WHO curves remain based on age in months.
   *
   * We do not attach the child's historical measurements to these
   * points anymore because the child trend has a different X-axis
   * (assessment date).
   */
  const chartData: ChartPoint[] = useMemo(() => {
    return referenceData;
  }, [referenceData]);

  /*
   * Current assessment fallback.
   *
   * This keeps the chart useful even if history has not been saved
   * or the history API is temporarily unavailable.
   */
  const fallbackTrendData: ChildTrendPoint[] = useMemo(() => {
    if (hasHistoricalData) {
      return childTrendData;
    }

    if (
      age === undefined ||
      weight === undefined ||
      !Number.isFinite(age) ||
      !Number.isFinite(weight)
    ) {
      return [];
    }

    return [
      {
        date: new Date().toISOString(),
        dateLabel: "Current",
        age,
        weight,
        height: 0,
        muac: null,
        assessmentId: 0,
      },
    ];
  }, [hasHistoricalData, childTrendData, age, weight]);

  /*
   * Basic validation.
   *
   * These guards intentionally run AFTER all hooks.
   */
  if (age === undefined || weight === undefined) {
    return (
      <GrowthChartCard message="Analyze a child to view weight-for-age data." />
    );
  }

  if (normalizedGender !== "male" && normalizedGender !== "female") {
    return (
      <GrowthChartCard message="Select the child's gender to view the appropriate WHO reference." />
    );
  }

  if (
    !Number.isFinite(ageInMonths) ||
    ageInMonths < 0 ||
    ageInMonths > 60 ||
    !Number.isFinite(weight)
  ) {
    return (
      <GrowthChartCard message="Weight-for-age data is available for children from 0 to 60 months." />
    );
  }

  /*
   * Loading state.
   */
  if (historyLoading) {
    return <GrowthChartCard message="Loading assessment history..." />;
  }

  /*
   * Use historical measurements when available.
   */
  const finalTrendData = fallbackTrendData;

  /*
   * We use a combined chart area for the WHO reference curves.
   *
   * The child trend is rendered separately because its X-axis is
   * assessment date rather than WHO age/month.
   *
   * This keeps the data semantically correct and prevents historical
   * measurements from being collapsed together.
   */
  return (
    <Card className="p-6 shadow-[var(--shadow-card)] border-border/60">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-lg">Growth Trend</h2>

          {hasHistoricalData && (
            <p className="text-xs text-muted-foreground mt-1">
              {history.length} assessment
              {history.length !== 1 ? "s" : ""} recorded
            </p>
          )}
        </div>

        <div className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background">
          WHO Weight-for-Age
        </div>
      </div>

      {/* ========================= */}
      {/* CHILD HISTORICAL TREND    */}
      {/* ========================= */}

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={finalTrendData}
            margin={{
              top: 10,
              right: 12,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />

            <XAxis
              dataKey="dateLabel"
              type="category"
              tick={{
                fontSize: 12,
                fill: "var(--muted-foreground)",
              }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tickFormatter={(value) => `${value} kg`}
              tick={{
                fontSize: 12,
                fill: "var(--muted-foreground)",
              }}
              axisLine={false}
              tickLine={false}
              width={48}
            />

            <Tooltip
              labelFormatter={(label) => `Assessment: ${label}`}
              formatter={(value: number, name: string) => {
                if (name === "Child Weight") {
                  return [formatKilograms(value), name];
                }

                return [value, name];
              }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card)",
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }

                const point = payload[0]?.payload as
                  | ChildTrendPoint
                  | undefined;

                if (!point) {
                  return null;
                }

                return (
                  <div
                    className="rounded-xl border bg-background p-3 shadow-[var(--shadow-card)]"
                    style={{
                      borderColor: "var(--border)",
                    }}
                  >
                    <p className="text-sm font-medium mb-2">
                      {label}
                    </p>

                    <div className="space-y-1 text-xs">
                      <p>
                        <span className="text-muted-foreground">
                          Age:
                        </span>{" "}
                        {formatAge(point.age)}
                      </p>

                      <p>
                        <span className="text-muted-foreground">
                          Weight:
                        </span>{" "}
                        <span className="font-medium">
                          {formatKilograms(point.weight)}
                        </span>
                      </p>

                      {Number.isFinite(point.height) &&
                        point.height > 0 && (
                          <p>
                            <span className="text-muted-foreground">
                              Height:
                            </span>{" "}
                            {point.height.toFixed(1)} cm
                          </p>
                        )}

                      {point.muac !== null &&
                        point.muac !== undefined &&
                        Number.isFinite(point.muac) && (
                          <p>
                            <span className="text-muted-foreground">
                              MUAC:
                            </span>{" "}
                            {point.muac.toFixed(1)} cm
                          </p>
                        )}
                    </div>
                  </div>
                );
              }}
            />

            <Legend
              iconType="circle"
              wrapperStyle={{
                fontSize: 12,
              }}
            />

            {/* Child's actual historical measurements */}

            <Line
              type="monotone"
              dataKey="weight"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={{
                r: 5,
                fill: "var(--primary)",
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 7,
              }}
              name="Child Weight"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ========================= */}
      {/* STATUS / ERROR MESSAGE    */}
      {/* ========================= */}

      {historyError ? (
        <div className="text-xs text-muted-foreground mt-3">
          {historyError} Showing the latest assessment instead.
        </div>
      ) : (
        <div className="text-xs text-muted-foreground mt-3">
          {hasHistoricalData
            ? "Child measurements are based on assessment history stored in PostgreSQL."
            : "Showing the current assessment. Historical measurements will appear after they are saved."}
        </div>
      )}

      {/* ========================= */}
      {/* WHO REFERENCE INFORMATION */}
      {/* ========================= */}

      <div className="text-xs text-muted-foreground mt-2">
        Reference: WHO Child Growth Standards (0–60 months). Reference curves
        are sex-specific.
      </div>
    </Card>
  );
}

function GrowthChartCard({ message }: { message: string }) {
  return (
    <Card className="p-6 shadow-[var(--shadow-card)] border-border/60">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-lg">Growth Trend</h2>

        <div className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background">
          WHO Weight-for-Age
        </div>
      </div>

      <div className="h-72 flex items-center justify-center text-center text-sm text-muted-foreground px-6">
        {message}
      </div>

      <div className="text-xs text-muted-foreground mt-3">
        Reference: WHO Child Growth Standards (0–60 months). Reference curves
        are sex-specific.
      </div>
    </Card>
  );
}