import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createConnection } from "mysql2/promise";
import { createMysqlTestEnvironment } from "./mysql-test-environment.js";
const migrationName = "20261026120000_service_planning";
const migrationRoot = join(process.cwd(), "prisma/migrations");

describe("shared service person upgrade on existing MariaDB data", () => {
  test("preserves MPG users, instructor links and signed training references during backfill", async () => {
    const database = await createMysqlTestEnvironment(
      "rescuebase_service_person_upgrade",
    );
    const url = new URL(database.databaseUrl);
    const connection = await createConnection({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      multipleStatements: true,
      dateStrings: true,
    });
    try {
      const folders = (await readdir(migrationRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && entry.name < migrationName)
        .map((entry) => entry.name)
        .sort();
      expect(folders.length).toBeGreaterThan(20);
      // Apply actual prior SQL before inserting the legacy records: no post-upgrade seed.
      for (const folder of folders)
        await connection.query(
          await readFile(join(migrationRoot, folder, "migration.sql"), "utf8"),
        );
      const [before] = await connection.query("SHOW TABLES LIKE 'Person'");
      expect(before).toEqual([]);
      await connection.query(`
        INSERT INTO User (id,email,displayName,role,updatedAt)
        VALUES ('legacy-user','migration@example.org','Jörg Müller','ADMIN','2026-06-01 10:00:00');
        INSERT INTO MpgPerson (id,name,userId,active,instructorAuthorized,instructorAuthorization,
          authorizationValidUntil,birthDate,qualificationDocumentId,version,createdAt,updatedAt)
        VALUES ('legacy-instructor','Jörg Müller','legacy-user',true,true,'Herstellereinweisung',
          '2027-12-31','1985-03-04','legacy-qualification',7,'2026-06-01 10:00:00','2026-10-01 12:00:00'),
          ('legacy-participant','Annika Weiß',null,false,false,null,null,null,null,3,
          '2026-06-02 10:00:00','2026-10-02 12:00:00');
        INSERT INTO MpgModel (id,name,manufacturer,manufacturerAddress,productType,updatedAt)
        VALUES ('legacy-model','Defibrillator','Hersteller','Berlin','DEFIBRILLATOR','2026-06-01');
        INSERT INTO MpgTraining (id,modelId,performedAt,contents,instructorId,finalizedAt,finalizedBy)
        VALUES ('legacy-training','legacy-model','2026-09-01','Bedienung und Prüfung',
          'legacy-instructor','2026-09-01 12:00:00','legacy-user');
        INSERT INTO MpgTrainingConfirmation
          (id,trainingId,personId,role,nameSnapshot,confirmationText,signatureHash,confirmedAt,confirmedBy)
        VALUES ('legacy-confirmation','legacy-training','legacy-participant','PARTICIPANT','Annika Weiß',
          'Einweisung bestätigt','unchanged-signature-hash','2026-09-01 12:00:00','legacy-user');
      `);
      const [legacyPeople] = await connection.query(
        "SELECT id,name,active,userId,createdAt,updatedAt FROM MpgPerson ORDER BY id",
      );
      const [legacyTraining] = await connection.query(
        "SELECT * FROM MpgTraining",
      );
      const [legacyConfirmation] = await connection.query(
        "SELECT * FROM MpgTrainingConfirmation",
      );
      // Only now apply the real upgrade against the populated old schema.
      await connection.query(
        await readFile(
          join(migrationRoot, migrationName, "migration.sql"),
          "utf8",
        ),
      );
      const [people] = await connection.query(
        "SELECT id,name,active,userId,createdAt,updatedAt FROM Person ORDER BY id",
      );
      expect(people).toEqual(legacyPeople);
      const [links] = await connection.query(
        "SELECT id,personId,version,instructorAuthorized,instructorAuthorization,qualificationDocumentId FROM MpgPerson ORDER BY id",
      );
      expect(links).toEqual([
        {
          id: "legacy-instructor",
          personId: "legacy-instructor",
          version: 7,
          instructorAuthorized: 1,
          instructorAuthorization: "Herstellereinweisung",
          qualificationDocumentId: "legacy-qualification",
        },
        {
          id: "legacy-participant",
          personId: "legacy-participant",
          version: 3,
          instructorAuthorized: 0,
          instructorAuthorization: null,
          qualificationDocumentId: null,
        },
      ]);
      const [training] = await connection.query("SELECT * FROM MpgTraining");
      const [confirmation] = await connection.query(
        "SELECT * FROM MpgTrainingConfirmation",
      );
      expect(training).toEqual(legacyTraining);
      expect(confirmation).toEqual(legacyConfirmation);
      const [linkedUser] =
        await connection.query(`SELECT u.id,mp.personId,p.userId FROM User u
        JOIN MpgPerson mp ON mp.userId=u.id JOIN Person p ON p.id=mp.personId WHERE u.id='legacy-user'`);
      expect(linkedUser).toEqual([
        {
          id: "legacy-user",
          personId: "legacy-instructor",
          userId: "legacy-user",
        },
      ]);
      const [qualifications] = await connection.query(
        "SELECT * FROM PersonQualification",
      );
      expect(qualifications).toEqual([]); // MPG authority must not invent medical qualifications.
      await expect(
        connection.query("DELETE FROM MpgPerson WHERE id='legacy-instructor'"),
      ).rejects.toMatchObject({ code: "ER_ROW_IS_REFERENCED_2" });
    } finally {
      await connection.end();
      await database.stop();
    }
  }, 180000);
});
