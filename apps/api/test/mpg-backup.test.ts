import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("MPG backup database configuration", () => {
  it("writes a private MariaDB client file from an encoded database URL", () => {
    const directory = mkdtempSync(join(tmpdir(), "rescuebase-backup-"));
    const output = join(directory, "mariadb.cnf");

    execFileSync("node", ["../../infra/backups/write-db-config.mjs", output], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: "mysql://backup:p%40ss@database:3307/rescuebase" },
    });

    expect(readFileSync(output, "utf8")).toBe(
      "[client]\nhost=database\nport=3307\nuser=backup\npassword=p@ss\ndatabase=rescuebase\n",
    );
    expect(statSync(output).mode & 0o777).toBe(0o600);
  });
});
