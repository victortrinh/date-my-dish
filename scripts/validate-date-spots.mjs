import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { dateSpotsSchema } from "../src/content-contracts/date-spot.mjs";

const spots = dateSpotsSchema.parse(JSON.parse(readFileSync("src/content/date-spots.json", "utf8")));
for (const spot of spots) {
  if (!existsSync(resolve("public", `.${spot.image.src}`))) {
    throw new Error(`${spot.id}: Editorial Image is missing: ${spot.image.src}`);
  }
}
console.log(`Validated ${spots.length} complete Date Spot Locale Pairs.`);
