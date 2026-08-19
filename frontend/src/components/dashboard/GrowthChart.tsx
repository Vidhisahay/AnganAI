import { Card } from "@/components/ui/card";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { whoWeightForAgeBoys, whoWeightForAgeGirls, type WhoWeightForAgePoint } from "@/data/whoWeightForAge";

interface GrowthChartProps {
  age?: number;
  gender?: string;
  weight?: number;
  childName?: string;
}

type ChartPoint = WhoWeightForAgePoint & { childWeight?: number };

const formatKilograms = (value: number) => `${value.toFixed(1)} kg`;

export function GrowthChart({ age, gender, weight }: GrowthChartProps) {
  if (age === undefined || weight === undefined) {
    return <GrowthChartCard message="Analyze a child to view weight-for-age data." />;
  }

  if (gender === undefined) {
    return <GrowthChartCard message="Select the child's gender to view the appropriate WHO reference." />;
  }

  const normalizedGender = gender.trim().toLowerCase();
  if (normalizedGender !== "male" && normalizedGender !== "female") {
    return <GrowthChartCard message="Select the child's gender to view the appropriate WHO reference." />;
  }

  const ageInMonths = Math.floor(age * 12);
  if (!Number.isFinite(ageInMonths) || ageInMonths < 0 || ageInMonths > 60 || !Number.isFinite(weight)) {
    return <GrowthChartCard message="Weight-for-age data is available for children from 0 to 60 months." />;
  }

  const referenceData = normalizedGender === "male" ? whoWeightForAgeBoys : whoWeightForAgeGirls;
  const chartData: ChartPoint[] = referenceData.map((point) =>
    point.month === ageInMonths ? { ...point, childWeight: weight } : point,
  );

  return (
    <Card className="p-6 shadow-[var(--shadow-card)] border-border/60">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-lg">Weight vs Age</h2>
        <div className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background">WHO Weight-for-Age</div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" type="number" domain={[0, 60]} tickCount={7} tickFormatter={(month) => `${month}m`} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value) => `${value} kg`} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              labelFormatter={(month) => `Age: ${month} months`}
              formatter={(value: number, name: string) => [formatKilograms(value), name]}
              contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="p3" stroke="var(--destructive)" strokeWidth={1.5} dot={false} name="WHO 3rd percentile" />
            <Line type="monotone" dataKey="p15" stroke="var(--warning)" strokeWidth={1.5} dot={false} name="WHO 15th percentile" />
            <Line type="monotone" dataKey="p50" stroke="var(--success)" strokeWidth={2} dot={false} name="WHO Median" />
            <Line type="monotone" dataKey="p85" stroke="var(--info)" strokeWidth={1.5} dot={false} name="WHO 85th percentile" />
            <Line type="monotone" dataKey="p97" stroke="var(--primary)" strokeWidth={1.5} dot={false} name="WHO 97th percentile" />
            <Line type="monotone" dataKey="childWeight" stroke="var(--primary)" strokeWidth={0} dot={{ r: 6, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }} activeDot={{ r: 7 }} name="Child Weight" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground mt-3">Reference: WHO Child Growth Standards (0–60 months). Reference curves are sex-specific.</div>
    </Card>
  );
}

function GrowthChartCard({ message }: { message: string }) {
  return (
    <Card className="p-6 shadow-[var(--shadow-card)] border-border/60">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-lg">Weight vs Age</h2>
        <div className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background">WHO Weight-for-Age</div>
      </div>
      <div className="h-72 flex items-center justify-center text-center text-sm text-muted-foreground px-6">{message}</div>
      <div className="text-xs text-muted-foreground mt-3">Reference: WHO Child Growth Standards (0–60 months). Reference curves are sex-specific.</div>
    </Card>
  );
}
