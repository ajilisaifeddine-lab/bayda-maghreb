import {z} from 'zod'; export const DialectSchema=z.object({name:z.string(),keywords:z.record(z.string()),symbols:z.record(z.string())});
