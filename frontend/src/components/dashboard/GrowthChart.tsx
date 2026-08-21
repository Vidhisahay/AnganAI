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

type ChartPoint = WhoWeightForAgePoint & {
  childWeight?: number;
};

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

const formatKilograms = (value: number) => `${value.toFixed(1)} kg`;

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

  const normalizedGender = gender?.trim().toLowerCase() ?? "";
  const ageInMonths = Math.floor((age ?? Number.NaN) * 12);

  /*
   * Select the appropriate WHO reference dataset.
   */
  const referenceData =
    normalizedGender === "male"
      ? whoWeightForAgeBoys
      : whoWeightForAgeGirls;

  /*
   * Build child measurement points from PostgreSQL history.
   *
   * We keep the WHO reference data as the base and then add
   * childWeight at the appropriate age/month.
   *
   * Multiple assessments at the same age are handled by keeping
   * the latest assessment for that month.
   */
  const childHistoryByMonth = useMemo(() => {
    const measurements = new Map<number, AssessmentHistory>();

    history.forEach((assessment) => {
      if (
        !Number.isFinite(assessment.age) ||
        !Number.isFinite(assessment.weight)
      ) {
        return;
      }

      const month = Math.floor(assessment.age * 12);

      if (month < 0 || month > 60) {
        return;
      }

      const existing = measurements.get(month);

      /*
       * If multiple assessments exist for the same age,
       * keep the most recent one.
       */
      if (!existing) {
        measurements.set(month, assessment);
        return;
      }

      const existingDate = new Date(existing.created_at).getTime();
      const currentDate = new Date(assessment.created_at).getTime();

      if (currentDate >= existingDate) {
        measurements.set(month, assessment);
      }
    });

    return measurements;
  }, [history]);

  /*
   * Combine WHO reference points with the child's historical weights.
   */
  const chartData: ChartPoint[] = useMemo(() => {
    return referenceData.map((point) => {
      const assessment = childHistoryByMonth.get(point.month);

      if (assessment) {
        return {
          ...point,
          childWeight: assessment.weight,
        };
      }

      return point;
    });
  }, [referenceData, childHistoryByMonth]);

  /*
   * If PostgreSQL history isn't available yet, use the current
   * assessment as a fallback so the chart doesn't disappear.
   */
  const hasHistoricalData = history.length > 0;

  const fallbackChartData: ChartPoint[] = useMemo(() => {
    if (hasHistoricalData) {
      return chartData;
    }

    return referenceData.map((point) =>
      point.month === ageInMonths
        ? {
            ...point,
            childWeight: weight,
          }
        : point,
    );
  }, [
    hasHistoricalData,
    chartData,
    referenceData,
    ageInMonths,
    weight,
  ]);

  /*
   * These guards deliberately run after every hook above. Previously, the
   * first render returned here before the memo hooks, while the post-analysis
   * render called them, causing React's "Rendered more hooks" runtime error.
   */
  if (age === undefined || weight === undefined) {
    return <GrowthChartCard message="Analyze a child to view weight-for-age data." />;
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
    return (
      <GrowthChartCard message="Loading assessment history..." />
    );
  }

  /*
   * Error state is not fatal.
   *
   * We can still show the current assessment using the fallback.
   */
  const finalChartData = fallbackChartData;

  return (
    <Card className="p-6 shadow-[var(--shadow-card)] border-border/60">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-lg">Weight vs Age</h2>

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

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={finalChartData}
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
              dataKey="month"
              type="number"
              domain={[0, 60]}
              tickCount={7}
              tickFormatter={(month) => `${month}m`}
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
              labelFormatter={(month) => `Age: ${month} months`}
              formatter={(value: number, name: string) => [
                formatKilograms(value),
                name,
              ]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card)",
              }}
            />

            <Legend
              iconType="circle"
              wrapperStyle={{
                fontSize: 12,
              }}
            />

            {/* WHO reference curves */}

            <Line
              type="monotone"
              dataKey="p3"
              stroke="var(--destructive)"
              strokeWidth={1.5}
              dot={false}
              name="WHO 3rd percentile"
            />

            <Line
              type="monotone"
              dataKey="p15"
              stroke="var(--warning)"
              strokeWidth={1.5}
              dot={false}
              name="WHO 15th percentile"
            />

            <Line
              type="monotone"
              dataKey="p50"
              stroke="var(--success)"
              strokeWidth={2}
              dot={false}
              name="WHO Median"
            />

            <Line
              type="monotone"
              dataKey="p85"
              stroke="var(--info)"
              strokeWidth={1.5}
              dot={false}
              name="WHO 85th percentile"
            />

            <Line
              type="monotone"
              dataKey="p97"
              stroke="var(--primary)"
              strokeWidth={1.5}
              dot={false}
              name="WHO 97th percentile"
            />

            {/* Child's historical measurements */}

            <Line
              type="monotone"
              dataKey="childWeight"
              stroke="var(--primary)"
              strokeWidth={2}
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
        <h2 className="font-semibold text-lg">Weight vs Age</h2>

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
