import { z } from "zod";
import type { Rules } from "./types";

const label = z.string().min(1).max(20_000);
const profileSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1).max(80),
  rules: z.object({
    mappings: z.array(z.object({ before: label, after: label }).strict()).max(100),
    keys: z.array(label).min(1).max(100), excluded: z.array(label).max(100),
  }).strict(),
}).strict();
const storeSchema = z.object({ version: z.literal(1), profiles: z.array(profileSchema).max(20) }).strict();
export type Profile = z.infer<typeof profileSchema>;
export const PROFILE_KEY = "mapcsv-compare-profiles-v1";

export function readProfiles(storage: Pick<Storage, "getItem">): Profile[] {
  const raw = storage.getItem(PROFILE_KEY);
  if (!raw) return [];
  try {
    return storeSchema.parse(JSON.parse(raw)).profiles;
  } catch {
    throw new Error("Saved profiles could not be read. Your CSV files are unaffected.");
  }
}

export function createProfile(name: string, rules: Rules): Profile {
  return profileSchema.parse({ id: crypto.randomUUID(), name, rules: {
    mappings: rules.mappings.map(({ before, after }) => ({ before, after })),
    keys: [...rules.keys], excluded: [...rules.excluded],
  } });
}

export function writeProfiles(storage: Pick<Storage, "setItem">, profiles: Profile[]): void {
  const value = storeSchema.parse({ version: 1, profiles });
  storage.setItem(PROFILE_KEY, JSON.stringify(value));
}
