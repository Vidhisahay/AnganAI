import axios from "axios";
import { z } from "zod";

export interface ChildFormValues {
  childCode: string;
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  muac: string;
}

export interface AnalyzeChildRequest {
  child_code?: string;
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  muac: number | null;
  date_of_birth?: string;
}

export interface AnalyzeChildResponse {
  child_data: {
    name: string;
    age: number;
    gender: string;
    height: number;
    weight: number;
    muac: number | null;
  };
  child_id: number;
  child_code: string;

  assessment: {
    growth_status: string;
    risk_level: string;
    summary: string;
    recommendation: string;
    follow_up_days: number;
  };
  nutrition: {
    breakfast: string;
    lunch: string;
    evening_snack: string;
    dinner: string;
    supplement: string;
  };
  report: {
    summary: string;
    parent_advice: string;
    worker_notes: string;
  };
}

export const anganApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const analyzeChildResponseSchema = z.object({
  child_data: z.object({
    name: z.string(),
    age: z.number(),
    gender: z.string(),
    height: z.number(),
    weight: z.number(),
    muac: z.number().nullable(),
  }),
  child_id: z.number(),
  child_code: z.string(),
  assessment: z.object({
    growth_status: z.string(),
    risk_level: z.string(),
    summary: z.string(),
    recommendation: z.string(),
    follow_up_days: z.number(),
  }),
  nutrition: z.object({
    breakfast: z.string(),
    lunch: z.string(),
    evening_snack: z.string(),
    dinner: z.string(),
    supplement: z.string(),
  }),
  report: z.object({
    summary: z.string(),
    parent_advice: z.string(),
    worker_notes: z.string(),
  }),
});

export async function analyzeChild(
  request: AnalyzeChildRequest,
): Promise<AnalyzeChildResponse> {
  console.info("Submitting child analysis request", request);

  try {
    const response = await anganApi.post<unknown>("/analyze", request);
    console.info("Received child analysis response", response.data);

    return analyzeChildResponseSchema.parse(response.data);
  } catch (error) {
    console.error("Child analysis request or response validation failed", error);

    throw error;
  }
}

export default anganApi;
