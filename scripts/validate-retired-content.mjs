// Guard the built public boundary, including feeds, metadata, and related links.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = "dist/client";
const retired = /\/(?:en\/(?:recipes|articles)|fr\/(?:recettes|articles))(?:\/|["'<>\s]|$)/;
const errors = [];
function inspect(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) inspect(file);
    else {
      const route = "/" + relative(root, file);
      if (retired.test(route)) errors.push(`Retired route: ${route}`);
      if (/\.(html|xml|txt|json)$/.test(file) && !file.includes("/pagefind/")) {
        if (retired.test(readFileSync(file, "utf8"))) errors.push(`Retired URL in ${file}`);
      }
    }
  }
}
inspect(root);
if (JSON.parse(readFileSync(join(root, "recipe-index.json"), "utf8")).length) {
  errors.push("Legacy bookmark index is not empty");
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Retired content: no public routes, links, feed entries, or bookmark entries.");
