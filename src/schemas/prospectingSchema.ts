import { z } from "zod";

export const ProspectingRequestSchema = z.object({
  targetUrl: z.string().min(1, "URL tidak boleh kosong").max(2048, "URL melebihi batas karakter"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  source: z.enum(["manual", "batch_csv", "hub_integration"]).default("manual"),
});

export type ProspectingRequest = z.infer<typeof ProspectingRequestSchema>;
