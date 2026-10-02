import { z } from "zod";

export const APP_VERSION = "v0.2.0";

export const analyticsEventNames = [
  "page_view",
  "sample_csv_parsed",
  "local_csv_parsed",
  "preview_opened",
  "mapping_opened",
  "validation_run",
  "export_csv",
  "export_json",
  "copy_json",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export const workflowTypes = ["none", "sample", "local"] as const;
export type WorkflowType = (typeof workflowTypes)[number];

export const exportFormats = ["csv", "json", "copy_json"] as const;
export type ExportFormat = (typeof exportFormats)[number];

const safeCampaignValue = z
  .string()
  .trim()
  .toLowerCase()
  .max(48)
  .regex(/^[a-z0-9._ -]*$/)
  .optional();

export const attributionSchema = z.object({
  source: safeCampaignValue.default("direct"),
  medium: safeCampaignValue.optional(),
  campaign: safeCampaignValue.optional(),
});

export type Attribution = z.infer<typeof attributionSchema>;

export const analyticsPayloadSchema = z
  .object({
    eventName: z.enum(analyticsEventNames),
    visitorId: z.string().uuid(),
    sessionId: z.string().uuid(),
    appVersion: z.literal(APP_VERSION),
    workflowType: z.enum(workflowTypes).default("none"),
    exportFormat: z.enum(exportFormats).optional(),
    attribution: attributionSchema,
    occurredAt: z.string().datetime().optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    const expectedFormat: Partial<Record<AnalyticsEventName, ExportFormat>> = {
      export_csv: "csv",
      export_json: "json",
      copy_json: "copy_json",
    };
    const requiredFormat = expectedFormat[payload.eventName];

    if (requiredFormat && payload.exportFormat !== requiredFormat) {
      context.addIssue({
        code: "custom",
        path: ["exportFormat"],
        message: `${payload.eventName} requires exportFormat=${requiredFormat}`,
      });
    }

    if (!requiredFormat && payload.exportFormat) {
      context.addIssue({
        code: "custom",
        path: ["exportFormat"],
        message: "exportFormat is allowed only for export events",
      });
    }
  });

export type AnalyticsPayload = z.infer<typeof analyticsPayloadSchema>;

export function parseAnalyticsPayload(input: unknown): AnalyticsPayload {
  return analyticsPayloadSchema.parse(input);
}
