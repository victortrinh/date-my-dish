import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { applyCompanion, companionSchema } from "./companion.mjs";

// Node-only loading shared by the Astro collections and the validators, so
// the build and `validate:source` see the same merged records.

export const DEFAULT_EDITORIAL_DIR = "src/content/editorial";

/**
 * Read and validate every Companion File in a directory.
 * @param {string} dir
 * @returns {Map<string, import("astro/zod").z.infer<typeof companionSchema>>} companions by record id
 */
export function readCompanions(dir = DEFAULT_EDITORIAL_DIR) {
  const companions = new Map();
  if (!existsSync(dir)) return companions;
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".json")).sort()) {
    const path = join(dir, file);
    const result = companionSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
    if (!result.success) {
      throw new Error(`${path}: ${result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ")}`);
    }
    if (`${result.data.id}.json` !== basename(file)) throw new Error(`${path}: a Companion File is named after its record id ("${result.data.id}.json")`);
    companions.set(result.data.id, result.data);
  }
  return companions;
}

/**
 * The Notion-derived records in `sourcePath`, each with its Companion File
 * merged over it. Records stay unvalidated: parse them with the collection
 * schema.
 * @param {string} sourcePath a collection JSON array
 * @param {string} [editorialDir]
 * @returns {Record<string, any>[]}
 */
export function loadCollection(sourcePath, editorialDir = DEFAULT_EDITORIAL_DIR) {
  const records = existsSync(sourcePath) ? JSON.parse(readFileSync(sourcePath, "utf8")) : [];
  const companions = readCompanions(editorialDir);
  return records.map((record) => {
    const companion = companions.get(record.id);
    return companion ? applyCompanion(record, companion) : record;
  });
}
