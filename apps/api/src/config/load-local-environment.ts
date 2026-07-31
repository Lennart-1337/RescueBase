import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const environmentPath = fileURLToPath(
  new URL("../../../../.env", import.meta.url),
);

if (existsSync(environmentPath)) {
  process.loadEnvFile(environmentPath);
}
