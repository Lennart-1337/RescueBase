import { writeFileSync } from "node:fs";

const [output] = process.argv.slice(2);
if (!output) throw new Error("Ausgabepfad fehlt.");
const url = new URL(process.env.DATABASE_URL ?? "");
if (!url.hostname || !url.pathname.slice(1)) throw new Error("DATABASE_URL ist ungültig.");
const config = `[client]\nhost=${url.hostname}\nport=${url.port || "3306"}\nuser=${decodeURIComponent(url.username)}\npassword=${decodeURIComponent(url.password)}\ndatabase=${url.pathname.slice(1)}\n`;
writeFileSync(output, config, { mode: 0o600, flag: "wx" });
