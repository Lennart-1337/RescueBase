import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rescueBaseOpenApiDocument } from "./document.js";

const currentFile = fileURLToPath(import.meta.url);
const apiRoot = resolve(dirname(currentFile), "../..");
const outputPath = resolve(apiRoot, "openapi.json");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(rescueBaseOpenApiDocument, null, 2)}\n`, "utf8");
