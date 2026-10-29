import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaService } from "../../../persistence/prisma.service.js";
import { audit, revision } from "../../mpg-validation.js";
import { MAX_DOCUMENT_BYTES, safeFilename } from "../../mpg-file-validation.js";
import { json } from "../catalog.service.js";
import { rethrowConflict } from "../persistence.js";
import { serviceInclude } from "../record.js";
import type { Input } from "../input.js";
import { billingInput, billingModel } from "./model.js";
import { renderBillingPdf } from "./pdf.js";
@Injectable()
export class ServiceBillingDocumentsService {
  constructor(private readonly db: PrismaService) {}
  async create(id: string, body: Input, actor: string) {
    const input = billingInput(body);
    let writtenPath: string | undefined;
    try {
      return await this.db.$transaction(
        async (tx) => {
          const row = await tx.serviceEvent.findUnique({
            where: { id, deletedAt: null },
            include: serviceInclude,
          });
          if (!row) throw new NotFoundException("Dienst nicht gefunden.");
          revision(row.version, input.version);
          const model = billingModel(row, input),
            buffer = await renderBillingPdf(model);
          if (buffer.length > MAX_DOCUMENT_BYTES)
            throw new BadRequestException(
              "Das PDF ist zu groß. Bitte die Zahl der Positionen reduzieren.",
            );
          const filename = safeFilename(
            `${input.kind === "OFFER" ? "Angebot" : "Rechnung"}-${input.number}.pdf`,
          );
          const storageKey = randomUUID(),
            sha256 = createHash("sha256").update(buffer).digest("hex");
          const directory = resolve(
            process.env.SERVICE_DOCUMENT_DIR ?? "./var/service-documents",
          );
          await mkdir(directory, { recursive: true, mode: 0o700 });
          const path = resolve(directory, storageKey);
          const file = await open(path, "wx", 0o600);
          writtenPath = path;
          try {
            await file.writeFile(buffer);
          } finally {
            await file.close();
          }
          await tx.serviceEvent.update({
            where: { id, deletedAt: null, version: row.version },
            data: { version: { increment: 1 } },
          });
          const document = await tx.serviceDocument.create({
            data: {
              serviceId: id,
              filename,
              mimeType: "application/pdf",
              storageKey,
              sha256,
              size: buffer.length,
              createdBy: actor,
              billingKind: input.kind,
              billingNumber: input.number,
              billingSnapshot: json(model),
            },
          });
          await audit(
            tx,
            actor,
            "ServiceEvent",
            id,
            "SERVICE_BILLING_DOCUMENT_CREATED",
            {
              documentId: document.id,
              kind: input.kind,
              number: input.number,
              issuedOn: input.issuedOn,
              validUntil: input.validUntil,
              sha256,
              previousVersion: row.version,
              version: row.version + 1,
            },
          );
          return { filename, buffer };
        },
        { timeout: 30000 },
      );
    } catch (error) {
      if (writtenPath) await unlink(writtenPath).catch(() => undefined);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "Diese Dokumentnummer ist bereits vergeben. Bitte eine andere Nummer verwenden.",
        );
      rethrowConflict(error);
    }
  }
}
