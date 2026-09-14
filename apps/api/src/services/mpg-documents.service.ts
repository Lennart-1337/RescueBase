import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaService } from "../persistence/prisma.service.js";
import { assertOwner, documentOwnerKeys, parseOwner, type DocumentOwner } from "./mpg-document-owner.js";
import { inspectUpload, safeFilename } from "./mpg-file-validation.js";

export type UploadedDocument = { buffer: Buffer; mimetype: string; originalname: string };

@Injectable()
export class MpgDocumentsService {
  constructor(private readonly prisma: PrismaService) {}
  private get directory() { return resolve(process.env.MPG_DOCUMENT_DIR ?? "./var/mpg-documents"); }

  async list(query: DocumentOwner) {
    const owner = parseOwner(query);
    await assertOwner(this.prisma, owner);
    const rows = await this.prisma.mpgDocument.findMany({ where: owner, orderBy: { createdAt: "desc" } });
    return rows.map(({ storageKey: _key, ...row }) => row);
  }

  async upload(file: UploadedDocument, body: DocumentOwner & { previousVersionId?: string }, actor: { id: string; email: string }) {
    const owner = parseOwner(body);
    const mimeType = inspectUpload(file.buffer, file.mimetype);
    const filename = safeFilename(file.originalname);
    const storageKey = randomUUID();
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const path = resolve(this.directory, storageKey);
    await writeFile(path, file.buffer, { flag: "wx", mode: 0o600 });
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await assertOwner(tx, owner);
        const previous = body.previousVersionId ? await tx.mpgDocument.findUnique({ where: { id: body.previousVersionId } }) : null;
        if (body.previousVersionId && (!previous || documentOwnerKeys.some((key) => (previous[key] ?? undefined) !== owner[key]))) {
          throw new ConflictException("Die vorherige Dokumentversion gehört nicht zu dieser Akte.");
        }
        const document = await tx.mpgDocument.create({ data: { ...owner, filename, mimeType, storageKey,
          sha256: createHash("sha256").update(file.buffer).digest("hex"), size: file.buffer.length,
          previousVersionId: previous?.id, version: previous ? previous.version + 1 : 1, createdBy: actor.id } });
        await tx.auditEvent.create({ data: { actorType: "USER", actorLabel: actor.email, action: "MPG_DOCUMENT_ADDED",
          entityType: "MpgDocument", entityId: document.id, payload: { actorId: actor.id, sha256: document.sha256, ...owner } } });
        return document;
      });
      const { storageKey: _key, ...metadata } = row;
      return metadata;
    } catch (error) {
      await unlink(path).catch(() => undefined);
      if (typeof error === "object" && error && "code" in error && error.code === "P2002") throw new ConflictException("Das Dokument wurde bereits versioniert. Bitte neu laden.");
      throw error;
    }
  }

  async read(id: string) {
    const document = await this.prisma.mpgDocument.findUnique({ where: { id } });
    if (!document) throw new NotFoundException("Dokument nicht gefunden.");
    if (!/^[a-f0-9-]{36}$/.test(document.storageKey)) throw new ConflictException("Ungültiger Dokumentschlüssel.");
    const buffer = await readFile(resolve(this.directory, document.storageKey));
    if (createHash("sha256").update(buffer).digest("hex") !== document.sha256) throw new ConflictException("Die Prüfsumme des Dokuments stimmt nicht überein.");
    return { document, buffer };
  }
}
