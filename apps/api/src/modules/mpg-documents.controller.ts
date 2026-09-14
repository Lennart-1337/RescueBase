import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { MpgGuard } from "../auth/mpg.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.guard.js";
import { MAX_DOCUMENT_BYTES } from "../services/mpg-file-validation.js";
import type { DocumentOwner } from "../services/mpg-document-owner.js";
import { MpgDocumentsService, type UploadedDocument } from "../services/mpg-documents.service.js";

@Controller("mpg/documents")
@UseGuards(MpgGuard)
export class MpgDocumentsController {
  constructor(private readonly documents: MpgDocumentsService) {}

  @Get()
  list(@Query() query: DocumentOwner) { return this.documents.list(query); }

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1, fields: 6 } }))
  upload(@UploadedFile() file: UploadedDocument | undefined, @Body() body: DocumentOwner & { previousVersionId?: string }, @Req() request: AuthenticatedRequest) {
    if (!file) throw new BadRequestException("Bitte ein Dokument auswählen.");
    return this.documents.upload(file, body, request.user!);
  }

  @Get(":id")
  async download(@Param("id") id: string, @Res() response: Response) {
    const { document, buffer } = await this.documents.read(id);
    response.setHeader("Content-Type", document.mimeType);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`);
    response.send(buffer);
  }
}
