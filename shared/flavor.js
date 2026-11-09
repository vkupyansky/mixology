import { z } from 'zod';

const text = z.string().max(10000).nullable();
const rating = z.number().int().min(1).max(5).nullable().optional();
export const flavorSchema = z.strictObject({
  description: text,
  tags: text,
  flavor_intensity: z.number().int().min(1).max(10).nullable(),
  flavor_profile: z
    .strictObject({ sweet: rating, sour: rating, tart: rating, umami: rating })
    .nullable(),
  aromatic_notes: z
    .strictObject({
      top: text.optional(),
      middle: text.optional(),
      base: text.optional(),
    })
    .nullable(),
  dominant_flavor: z.enum(['', 'акцент', 'основной']).nullable(),
  temporal_dynamics: z
    .enum([
      '',
      'быстро выгорает',
      'раскрывается постепенно',
      'стабилен весь сеанс',
    ])
    .nullable(),
  strength: z.enum(['', 'легкий', 'средний', 'крепкий']).nullable(),
  seasonality: z
    .enum(['', 'лето', 'осень', 'зима', 'весна', 'межсезон'])
    .nullable(),
  cultural_associations: text,
  flavor_type: text,
});

export const editableFields = flavorSchema.keyof().options;
export const flavorRecordSchema = flavorSchema.extend({
  id: z.number().int().positive(),
  brand: z.string(),
  name: z.string(),
});
export const namesSchema = z.array(
  z.strictObject({
    id: z.number().int().positive(),
    name: z.string(),
    status: z.enum(['empty', 'complete']),
  }),
);
/** @typedef {z.infer<typeof flavorSchema> & {id: number, brand: string, name: string}} Flavor */
