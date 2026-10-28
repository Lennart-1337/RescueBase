import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaService } from "../../persistence/prisma.service.js";
import { audit, revision } from "../mpg-validation.js";
import {
  inspectUpload,
  safeFilename,
  MAX_DOCUMENT_BYTES,
} from "../mpg-file-validation.js";
import type { UploadedDocument } from "../mpg-documents.service.js";
import { rethrowConflict } from "./persistence.js";
import { serviceInclude } from "./record.js";
@Injectable()
export class ServiceDocumentsService {
  constructor(private readonly db: PrismaService) {}
  private get directory() {
    return resolve(
      process.env.SERVICE_DOCUMENT_DIR ?? "./var/service-documents",
    );
  }
  async list(serviceId: string) {
    const service = await this.db.serviceEvent.findUnique({
      where: { id: serviceId, deletedAt: null },
      include: serviceInclude,
    });
    if (!service) throw new NotFoundException("Dienst nicht gefunden.");
    return service.documents;
  }
  async upload(
    serviceId: string,
    version: unknown,
    file: UploadedDocument,
    actor: string,
  ) {
    if (file.buffer.length > MAX_DOCUMENT_BYTES)
      throw new BadRequestException("Datei ist zu groß.");
    const mimeType = inspectUpload(file.buffer, file.mimetype),
      filename = safeFilename(file.originalname),
      storageKey = randomUUID();
    if (typeof version !== "string" || !/^\d+$/.test(version))
      throw new BadRequestException("Version fehlt.");
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const path = resolve(this.directory, storageKey);
    await writeFile(path, file.buffer, { flag: "wx", mode: 0o600 });
    try {
      const document = await this.db.$transaction(async (tx) => {
        const service = await tx.serviceEvent.findUnique({
          where: { id: serviceId, deletedAt: null },
        });
        if (!service) throw new NotFoundException("Dienst nicht gefunden.");
        revision(service.version, Number(version));
        if (["COMPLETED", "CANCELLED"].includes(service.status))
          throw new BadRequestException(
            "Dienst muss zuerst wieder geöffnet werden.",
          );
        await tx.serviceEvent.update({
          where: { id: serviceId, version: service.version, deletedAt: null },
          data: { version: { increment: 1 } },
        });
        const row = await tx.serviceDocument.create({
          data: {
            serviceId,
            filename,
            mimeType,
            storageKey,
            sha256: createHash("sha256").update(file.buffer).digest("hex"),
            size: file.buffer.length,
            createdBy: actor,
          },
        });
        await audit(
          tx,
          actor,
          "ServiceEvent",
          serviceId,
          "SERVICE_DOCUMENT_ADDED",
          { documentId: row.id, sha256: row.sha256 },
        );
        return row;
      });
      const { storageKey: _key, ...metadata } = document;
      return metadata;
    } catch (error) {
      await unlink(path).catch(() => undefined);
      rethrowConflict(error);
    }
  }
  async read(serviceId: string, id: string) {
    const document = await this.db.serviceDocument.findFirst({
      where: { id, serviceId, service: { deletedAt: null } },
    });
    if (!document || !/^[a-f0-9-]{36}$/.test(document.storageKey))
      throw new NotFoundException("Dokument nicht gefunden.");
    const buffer = await readFile(resolve(this.directory, document.storageKey));
    if (createHash("sha256").update(buffer).digest("hex") !== document.sha256)
      throw new BadRequestException("Dokumentprüfung fehlgeschlagen.");
    return { document, buffer };
  }
}
