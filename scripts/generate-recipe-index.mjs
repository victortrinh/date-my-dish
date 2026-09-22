// Retired Legacy Content must also disappear from old bookmark clients.
import { writeFileSync } from "node:fs";
writeFileSync(new URL("../dist/client/recipe-index.json", import.meta.url), "[]\n");
