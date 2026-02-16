import { z } from 'zod';

/**
 * Email draft validation schema
 */
export const emailDraftSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be 200 characters or less'),
  body: z
    .string()
    .min(1, 'Email body is required')
    .max(50000, 'Email body must be 50,000 characters or less'),
  research_id: z.string().uuid().optional(),
  ghl_contact_id: z.string().optional(),
});

export type EmailDraftInput = z.infer<typeof emailDraftSchema>;

/**
 * Email send validation schema
 */
export const emailSendSchema = z.object({
  contact_id: z.string().min(1, 'Contact ID is required'),
});

export type EmailSendInput = z.infer<typeof emailSendSchema>;

/**
 * Research input validation schema
 */
export const researchInputSchema = z.object({
  company_name: z
    .string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be 200 characters or less'),
  company_website: z
    .string()
    .url('Invalid website URL')
    .optional()
    .or(z.literal('')),
  industry: z
    .string()
    .max(100, 'Industry must be 100 characters or less')
    .optional(),
  research_type: z
    .enum(['quick', 'standard', 'deep'])
    .default('standard'),
  ghl_contact_id: z.string().optional(),
  ghl_company_id: z.string().optional(),
});

export type ResearchInput = z.infer<typeof researchInputSchema>;

/**
 * GHL configuration validation schema
 */
export const ghlConfigSchema = z.object({
  location_id: z
    .string()
    .min(1, 'Location ID is required')
    .max(100, 'Location ID must be 100 characters or less'),
  email_from: z.string().email('Invalid email address').optional(),
});

export type GhlConfigInput = z.infer<typeof ghlConfigSchema>;

/**
 * API key validation schema
 */
export const apiKeySchema = z.object({
  provider: z.enum(['openai', 'gemini', 'anthropic', 'tavily', 'ghl', 'apollo']),
  key: z
    .string()
    .min(10, 'API key must be at least 10 characters')
    .max(500, 'API key must be 500 characters or less'),
});

export type ApiKeyInput = z.infer<typeof apiKeySchema>;

/**
 * Prompt template validation schema
 */
export const promptTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  type: z.enum(['research', 'email']),
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content must be 50,000 characters or less'),
  is_default: z.boolean().default(false),
});

export type PromptTemplateInput = z.infer<typeof promptTemplateSchema>;

/**
 * Email generation request schema
 */
export const emailGenerationSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  persona: z.enum([
    'cfo_finance',
    'ceo_gm',
    'pricing_rgm',
    'sales_commercial',
    'technology_analytics',
  ]),
  tone: z.enum(['formal', 'professional', 'casual', 'friendly']).default('professional'),
});

export type EmailGenerationInput = z.infer<typeof emailGenerationSchema>;

/**
 * GHL contact query schema
 */
export const ghlContactQuerySchema = z.object({
  company_id: z.string().optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type GhlContactQueryInput = z.infer<typeof ghlContactQuerySchema>;

/**
 * Pagination schema for list endpoints
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Validates data against a schema and returns typed result or throws ValidationError
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors: Record<string, string[]> = {};
    result.error.errors.forEach((err) => {
      const path = err.path.join('.') || 'root';
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });

    // Import ValidationError here to avoid circular dependency
    const { ValidationError } = require('@/lib/errors');
    throw new ValidationError('Validation failed', errors);
  }

  return result.data;
}

/**
 * Safe validation that returns a result object instead of throwing
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors: Record<string, string[]> = {};
    result.error.errors.forEach((err) => {
      const path = err.path.join('.') || 'root';
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });

    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
