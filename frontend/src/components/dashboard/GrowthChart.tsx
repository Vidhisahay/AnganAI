import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend, Area, ComposedChart } from "recharts";

const data = [
  { age: "0", normal: 4, atRisk: 3, severe: 2, rahul: 3.8 },
  { age: "6m", normal: 7, atRisk: 5.5, severe: 4, rahul: 6.9 },
  { age: "1y", normal: 9, atRisk: 7, severe: 5.5, rahul: 8.5 },
  { age: "1.5y", normal: 10.5, atRisk: 8, severe: 6.5, rahul: 8.8 },
  { age: "2y", normal: 12, atRisk: 9.5, severe: 7.5, rahul: 9.2 },
  { age: "2.5y", normal: 13.2, atRisk: 10.5, severe: 8.2, rahul: 10.1 },
  { age: "3y", normal: 14.5, atRisk: 11.5, severe: 9, rahul: 10.5 },
];

export function GrowthChart() {
  return (
    <Card className="p-6 shadow-[var(--shadow-card)] border-border/60">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-lg">Weight vs Age</h2>
        <div className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background">Weight-for-Age</div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="age" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="normal" stroke="var(--success)" fill="var(--success)" fillOpacity={0.12} name="Normal" />
            <Line type="monotone" dataKey="atRisk" stroke="var(--warning)" strokeWidth={2} dot={false} name="At Risk" />
            <Line type="monotone" dataKey="severe" stroke="var(--destructive)" strokeWidth={2} dot={false} name="Severe" />
            <Line type="monotone" dataKey="rahul" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)" }} name="Rahul" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground mt-3">Source: WHO Growth Standards</div>
    </Card>
  );
}
