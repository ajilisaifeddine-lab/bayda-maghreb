import {z} from 'zod'; export const DialectSchema=z.object({code:z.string(),name:z.string(),script:z.string(),keywords:z.record(z.string(),z.string()),vocabulary:z.record(z.string(),z.string()).optional(),symbols:z.record(z.string(),z.string()).optional(),kind:z.string().optional()});
export const SCHEMA_VERSION=1;
