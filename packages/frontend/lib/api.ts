import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Erro desconhecido");
    throw new Error(errorText || `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const LeadSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  title: z.string().min(1),
  status: z.enum(["open", "won", "lost"]),
  contactId: z.string().uuid().optional(),
  valueCents: z.number().optional(),
  currency: z.string().default("BRL"),
  contactName: z.string().optional(),
  pipelineName: z.string().optional(),
  stageName: z.string().optional(),
});

export type Lead = z.infer<typeof LeadSchema>;
