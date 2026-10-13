import { MpgTrainingsService } from "../src/services/mpg-trainings.service.js";
import type { PrismaService } from "../src/persistence/prisma.service.js";

const signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

it("closes a group training in the last confirmation transaction and rejects later changes", async () => {
  const training = { id: "training", version: 0, finalizedAt: null as Date | null, finalizedBy: null as string | null };
  const confirmations = ["instructor", "participant"].map(id => ({ id, trainingId: training.id, personId: id,
    role: id === "instructor" ? "INSTRUCTOR" : "PARTICIPANT", confirmedAt: null as Date | null,
    confirmedBy: null as string | null, signatureHash: null as string | null }));
  const events: string[] = [];
  const tx = {
    mpgTraining: {
      findUniqueOrThrow: async () => ({ ...training, confirmations: confirmations.map(row => ({ ...row })) }),
      update: async ({ where, data }: { where: { version: number }; data: { finalizedAt?: Date; finalizedBy?: string } }) => {
        if (where.version !== training.version) throw new Error("Stale version");
        training.version += 1; training.finalizedAt = data.finalizedAt ?? null; training.finalizedBy = data.finalizedBy ?? null;
      }
    },
    mpgTrainingConfirmation: {
      findUniqueOrThrow: async ({ where }: { where: { trainingId_personId_role: { personId: string; role: string } } }) => {
        const row = confirmations.find(item => item.personId === where.trainingId_personId_role.personId && item.role === where.trainingId_personId_role.role);
        if (!row) throw new Error("Unknown person"); return { ...row };
      },
      update: async ({ where, data }: { where: { id: string }; data: { confirmedAt: Date; confirmedBy: string; signatureHash: string } }) => {
        const row = confirmations.find(item => item.id === where.id)!;
        Object.assign(row, data); return { ...row };
      },
      count: async () => confirmations.filter(row => !row.confirmedAt).length
    },
    auditEvent: { create: async ({ data }: { data: { action: string } }) => { events.push(data.action); } }
  };
  const db = { $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) } as unknown as PrismaService;
  const service = new MpgTrainingsService(db);
  const first = await service.confirm(training.id, { version: 0, personId: "instructor", role: "INSTRUCTOR",
    confirmationText: "Persönlich bestätigt", signaturePngDataUrl: signature }, "admin");
  expect(first.finalizedAt).toBeNull();
  const last = await service.confirm(training.id, { version: 1, personId: "participant", role: "PARTICIPANT",
    confirmationText: "Persönlich bestätigt", signaturePngDataUrl: signature }, "admin");
  expect(last.finalizedAt).toBeInstanceOf(Date);
  expect(last.finalizedBy).toBe("admin");
  expect(events).toEqual(["MPG_TRAINING_CONFIRMED", "MPG_TRAINING_CONFIRMED", "MPG_TRAINING_FINALIZED"]);
  await expect(service.confirm(training.id, { version: 2, personId: "participant", role: "PARTICIPANT",
    confirmationText: "Geändert", signaturePngDataUrl: signature }, "admin")).rejects.toThrow("Nachweis ist abgeschlossen");
});
