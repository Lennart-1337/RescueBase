import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";

describe("document-aware backup and restore", () => {
  it("does not create a successful archive when the database dump fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "rescuebase-backup-failure-"));
    try {
      const bin = join(dir, "bin"),
        backups = join(dir, "backups");
      mkdirSync(bin);
      mkdirSync(backups);
      writeFileSync(join(bin, "mariadb-dump"), "#!/bin/sh\nexit 42\n", {
        mode: 0o700,
      });
      expect(() =>
        execFileSync("sh", [resolve("../../infra/backups/backup-mariadb.sh")], {
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            DATABASE_URL: "test",
            BACKUP_DIR: backups,
          },
        }),
      ).toThrow();
      expect(readdirSync(backups)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("round-trips database and both protected document stores together", () => {
    const dir = mkdtempSync(join(tmpdir(), "rescuebase-backup-test-"));
    try {
      const bin = join(dir, "bin"),
        mpg = join(dir, "mpg"),
        services = join(dir, "services"),
        backups = join(dir, "backups");
      for (const path of [bin, mpg, services, backups]) mkdirSync(path);
      writeFileSync(
        join(bin, "mariadb-dump"),
        '#!/bin/sh\nprintf "database snapshot"\n',
        { mode: 0o700 },
      );
      writeFileSync(
        join(bin, "mariadb"),
        '#!/bin/sh\ncat > "$RESTORED_SQL"\n',
        { mode: 0o700 },
      );
      writeFileSync(join(mpg, "existing-evidence"), "MPG evidence");
      writeFileSync(join(services, "briefing"), "Dienstunterlagen");
      const env = {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        DATABASE_URL: "test",
        BACKUP_DIR: backups,
        MPG_DOCUMENT_DIR: mpg,
        SERVICE_DOCUMENT_DIR: services,
        RESTORED_SQL: join(dir, "restored.sql"),
      };
      execFileSync("sh", [resolve("../../infra/backups/backup-mariadb.sh")], {
        env,
      });
      const file = readdirSync(backups).find((name) =>
        name.endsWith(".tar.gz"),
      );
      expect(file).toBeDefined();
      rmSync(join(services, "briefing"));
      rmSync(join(mpg, "existing-evidence"));
      execFileSync("sh", [resolve("../../infra/backups/restore-mariadb.sh")], {
        env: { ...env, BACKUP_FILE: join(backups, file!) },
      });
      expect(readFileSync(env.RESTORED_SQL, "utf8")).toBe("database snapshot");
      expect(readFileSync(join(services, "briefing"), "utf8")).toBe(
        "Dienstunterlagen",
      );
      expect(readFileSync(join(mpg, "existing-evidence"), "utf8")).toBe(
        "MPG evidence",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
