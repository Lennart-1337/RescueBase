import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/auth.guard.js";
import { ServicesGuard } from "../../auth/services.guard.js";
import { ServiceDocumentsService } from "../../services/service-planning/documents.service.js";
import { MAX_DOCUMENT_BYTES } from "../../services/mpg-file-validation.js";
import type { UploadedDocument } from "../../services/mpg-documents.service.js";
@Controller("services/:id/documents")
@UseGuards(ServicesGuard)
export class ServiceDocumentsController {
  constructor(private readonly documents: ServiceDocumentsService) {}
  @Get() list(@Param("id") id: string) {
    return this.documents.list(id);
  }
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1, fields: 1 },
    }),
  )
  upload(
    @Param("id") id: string,
    @UploadedFile() file: UploadedDocument | undefined,
    @Body() body: { version?: unknown },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException("Bitte eine Datei auswählen.");
    return this.documents.upload(id, body.version, file, req.user!.id);
  }
  @Get(":documentId") async download(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
    @Res() response: Response,
  ) {
    const { document, buffer } = await this.documents.read(id, documentId);
    response.setHeader("Content-Type", document.mimeType);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
    );
    response.send(buffer);
  }
}
