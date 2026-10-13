import { MpgCylindersService } from "../src/services/mpg-cylinders.service.js";
import { MpgOperationsService } from "../src/services/mpg-operations.service.js";
import type { PrismaService } from "../src/persistence/prisma.service.js";

const asDb = (tx: unknown) => ({ $transaction: (work: (value: unknown) => Promise<unknown>) => work(tx) }) as PrismaService;

it("snapshots a documented BZ range and retains an expired control as failed", async () => {
  let saved: Record<string, unknown> = {};
  const tx = {
    mpgDevice: { findUniqueOrThrow: async () => ({ id: "device", mpgModelId: "model", retiredAt: null, mpgModel: { productType: "Blutzucker", name: "BZ" } }) },
    mpgGlucoseRange: { findUniqueOrThrow: async () => ({ id: "range", modelId: "model", solutionName: "Lösung", solutionLot: "LOT", stripLot: "STRIP",
      solutionExpiresAt: new Date("2024-12-31"), controlLevel: "Normal", unit: "mg/dL", targetMin: 80, targetMax: 120, source: "Herstellerbeleg" }) },
    mpgPerson: { findFirstOrThrow: async () => ({ id: "person" }) },
    mpgGlucoseControl: { create: async ({ data }: { data: Record<string, unknown> }) => { saved = data; return { id: "control", ...data }; } },
    auditEvent: { create: async () => ({ id: "audit" }) }
  };
  const result = await new MpgOperationsService(asDb(tx)).glucose("device", { performedAt: "2025-01-01", personId: "person", glucoseRangeId: "range", value: 100 }, "admin");
  expect(result.passed).toBe(false);
  expect(saved).toMatchObject({ unit: "mg/dL", targetUnit: "mg/dL", targetMin: 80, targetMax: 120,
    solutionLot: "LOT", rangeSource: "Herstellerbeleg", glucoseRangeId: "range" });
  await expect(new MpgOperationsService(asDb(tx)).glucose("device", { performedAt: "2025-01-01", personId: "person", glucoseRangeId: "range", value: 100, targetMax: 200 }, "admin"))
    .rejects.toThrow("dokumentierten Chargenvorgabe");
  const mismatched = await new MpgOperationsService(asDb(tx)).glucose("device", { performedAt: "2025-01-01", personId: "person", glucoseRangeId: "range", value: 100, unit: "mmol/L" }, "admin");
  expect(mismatched.passed).toBe(false);
  expect(mismatched.clarification).toContain("unterschiedliche Einheiten");
  expect(saved).toMatchObject({ unit: "mmol/L", targetUnit: "mg/dL" });
});

it("creates a distinct new cylinder and returns the old one in one transaction", async () => {
  const actions: string[] = [];
  const tx = {
    mpgCylinder: {
      findUniqueOrThrow: async () => ({ id: "old", version: 2, cylinderNumber: "O2-1", status: "EMPTY" }),
      create: async ({ data }: { data: Record<string, unknown> }) => { actions.push("create"); return { id: "new", ...data }; },
      update: async () => { actions.push("return"); return { id: "old", cylinderNumber: "O2-1", status: "RETURNED" }; }
    },
    location: { findFirstOrThrow: async () => ({ id: "loc" }) },
    auditEvent: { create: async () => ({ id: "audit" }) }
  };
  const result = await new MpgCylindersService(asDb(tx)).swap("old", { version: 2, cylinderNumber: "O2-2", sizeLiters: 2,
    locationId: "loc", inspectedAt: "2025-01-01", inspectionDueAt: "2027-01-01", expiresAt: "2026-01-01" }, "admin");
  expect(actions).toEqual(["create", "return"]);
  expect(result).toMatchObject({ returned: { id: "old", cylinderNumber: "O2-1", status: "RETURNED" }, replacement: { id: "new", cylinderNumber: "O2-2", status: "FULL" } });
});
