import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, User } from "lucide-react";
import type { ChangeEvent } from "react";
import type { ChildFormValues } from "@/api/anganApi";

type ChildInfoCardProps = {
  values: ChildFormValues;
  onFieldChange: (field: keyof ChildFormValues, value: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  childCode?: string;
};

export function ChildInfoCard({
  values,
  onFieldChange,
  onAnalyze,
  isAnalyzing,
  childCode,
}: ChildInfoCardProps) {
  const handleInputChange =
    (field: keyof ChildFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
      onFieldChange(field, event.target.value);
    };
  return (
    <Card className="p-6 shadow-[var(--shadow-card)] border-border/60">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <User className="w-4 h-4 text-accent-foreground" />
          </div>
          <h2 className="font-semibold text-lg">Child Information</h2>
        </div>
        <span className="text-xs text-muted-foreground">Last assessed: {new Date().toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      </div>

      {childCode ? (
        <p className="mb-4 text-sm font-medium text-muted-foreground">
          Child ID: {childCode}
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Child ID <span className="text-muted-foreground text-xs">optional</span></Label>
          <Input value={values.childCode} onChange={handleInputChange("childCode")} placeholder="ANG-000001" />
        </div>
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={values.name} onChange={handleInputChange("name")} />
        </div>
        <div className="space-y-1.5">
          <Label>Age</Label>
          <Input
            value={values.age}
            onChange={handleInputChange("age")}
            type="number"
            min="0"
            step="1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={values.gender} onValueChange={(value) => onFieldChange("gender", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Height (cm)</Label>
          <Input
            value={values.height}
            onChange={handleInputChange("height")}
            type="number"
            min="0"
            step="0.1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Weight (kg)</Label>
          <Input
            value={values.weight}
            onChange={handleInputChange("weight")}
            type="number"
            min="0"
            step="0.1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            MUAC (cm) <span className="text-muted-foreground text-xs">optional</span>
          </Label>
          <Input
            value={values.muac}
            onChange={handleInputChange("muac")}
            type="number"
            min="0"
            step="0.1"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          size="lg"
          className="gap-2 shadow-lg shadow-primary/20"
          onClick={onAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}{" "}
          Analyze Child
        </Button>
      </div>
    </Card>
  );
}
