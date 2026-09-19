import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

export const documentOwnerKeys = ["deviceId", "modelId", "inspectionId", "trainingId", "personId"] as const;
export type DocumentOwner = Partial<Record<(typeof documentOwnerKeys)[number], string>>;

export function parseOwner(body: DocumentOwner): DocumentOwner {
  const owners = documentOwnerKeys.filter((key) => typeof body[key] === "string" && body[key]!.trim());
  if (owners.length !== 1) throw new BadRequestException("Genau eine Zuordnung zum Dokument ist erforderlich.");
  const key = owners[0];
  if (!key) throw new BadRequestException("Genau eine Zuordnung zum Dokument ist erforderlich.");
  return { [key]: body[key]!.trim() };
}

export async function assertOwner(tx: Prisma.TransactionClient, owner: DocumentOwner) {
  let exists: unknown;
  if (owner.deviceId) exists = await tx.mpgDevice.findUnique({ where: { id: owner.deviceId } });
  if (owner.modelId) exists = await tx.mpgModel.findUnique({ where: { id: owner.modelId } });
  if (owner.personId) exists = await tx.mpgPerson.findUnique({ where: { id: owner.personId } });
  if (owner.inspectionId) exists = await tx.mpgInspection.findUnique({ where: { id: owner.inspectionId } });
  if (owner.trainingId) exists = await tx.mpgTraining.findUnique({ where: { id: owner.trainingId } });
  if (!exists) throw new NotFoundException("Die zugehörige Akte wurde nicht gefunden.");
}
