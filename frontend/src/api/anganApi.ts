import axios from "axios";

export interface ChildFormValues {
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  muac: string;
}

export interface AnalyzeChildRequest {
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  muac: number;
}

export interface AnalyzeChildResponse {
  child_data: {
    name: string;
    age: number;
    gender: string;
    height: number;
    weight: number;
    muac: number;
  };
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

export async function analyzeChild(request: AnalyzeChildRequest) {
  const response = await anganApi.post<AnalyzeChildResponse>("/analyze", request);

  return response.data;
}

export default anganApi;
