import { z } from 'zod';

export const uuid = z.uuid();

/** Indian mobile in E.164 (+91XXXXXXXXXX) or any E.164 number for NRIs. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .transform((v) => (/^[6-9]\d{9}$/.test(v) ? `+91${v}` : v))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid mobile number'));

/** Normalised (trimmed, lower-cased) email address. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Enter a valid email address')
  .pipe(z.email('Enter a valid email address'));

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/, 'Use 3–48 letters, numbers or hyphens');

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

/** Standard error envelope returned by the API. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
}
