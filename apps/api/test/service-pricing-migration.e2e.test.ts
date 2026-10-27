import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createConnection } from "mysql2/promise";
import { createMysqlTestEnvironment } from "./mysql-test-environment.js";
const migration = "20261026133000_simplify_service_pricing";
const root = join(process.cwd(), "prisma/migrations");
describe("hourly service pricing migration", () => {
  test("keeps completed calculation lines and identities while removing pauses", async () => {
    const database = await createMysqlTestEnvironment(
      "rescuebase_service_pricing_upgrade",
    );
    const url = new URL(database.databaseUrl);
    const connection = await createConnection({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      multipleStatements: true,
    });
    try {
      const folders = (await readdir(root, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && entry.name < migration)
        .map((entry) => entry.name)
        .sort();
      for (const folder of folders)
        await connection.query(
          await readFile(join(root, folder, "migration.sql"), "utf8"),
        );
      await connection.query(`
        INSERT INTO Person (id,name,updatedAt) VALUES ('helper','Helferin',NOW());
        INSERT INTO ServiceEvent (id,status,title,eventType,customer,organizer,leadOrganization,
          contactName,contactEmail,contactPhone,location,eventStartsAt,eventEndsAt,startsAt,endsAt,
          description,requirements,outcome,updatedAt)
        VALUES ('closed','COMPLETED','Alt','Sport','Kunde','','','','','','Köln',
          '2026-10-25 08:00','2026-10-25 10:00','2026-10-25 08:00','2026-10-25 10:00','','','{}',NOW()),
          ('open','PLANNING','Offen','Sport','Kunde','','','','','','Köln',
          '2026-10-25 08:00','2026-10-25 10:00','2026-10-25 08:00','2026-10-25 10:00','','','{}',NOW());
        INSERT INTO ServiceAssignment (id,serviceId,personId,positionId,qualification,startsAt,endsAt,breakMinutes)
        VALUES ('assignment','closed','helper','position','SANITARIAN','2026-10-25 08:00','2026-10-25 10:00',30);
        INSERT INTO ServiceCostLine (id,serviceId,label,category,unit,plannedQuantity,costRate,saleRate)
        VALUES ('line','closed','Altbestand','PERSONNEL','h',2,10,20);
      `);
      const [before] = await connection.query("SELECT * FROM ServiceCostLine");
      await connection.query(
        await readFile(join(root, migration, "migration.sql"), "utf8"),
      );
      const [events] = await connection.query(
        "SELECT id,pricingModel,materialDiscounted FROM ServiceEvent ORDER BY id",
      );
      expect(events).toEqual([
        { id: "closed", pricingModel: "LEGACY", materialDiscounted: 0 },
        { id: "open", pricingModel: "HOURLY", materialDiscounted: 0 },
      ]);
      const [after] = await connection.query("SELECT * FROM ServiceCostLine");
      expect(after).toEqual(before);
      const [assignments] = await connection.query(
        "SELECT id,personId,hourlyRate FROM ServiceAssignment",
      );
      expect(assignments).toEqual([
        { id: "assignment", personId: "helper", hourlyRate: "0.0000" },
      ]);
      const [columns] = await connection.query(
        "SHOW COLUMNS FROM ServiceAssignment WHERE Field IN ('breakMinutes','actualBreakMinutes')",
      );
      expect(columns).toEqual([]);
    } finally {
      await connection.end();
      await database.stop();
    }
  }, 180000);
});
