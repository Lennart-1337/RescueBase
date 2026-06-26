import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/auth.decorators.js";
import { AlertsService } from "../services/alerts.service.js";
import { AuditService } from "../services/audit.service.js";
import { PrismaService } from "../persistence/prisma.service.js";

@ApiTags("Stammdaten")
@Roles("ADMIN")
@Controller("catalog/devices")
export class MedicalDevicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly alerts: AlertsService
  ) {}

  @Get()
  async list() {
    const devices = await this.prisma.medicalDevice.findMany({
      where: { active: true },
      include: deviceInclude,
      orderBy: [{ location: { name: "asc" } }, { name: "asc" }]
    });
    return devices.map(mapDevice);
  }

  @Post()
  async create(@Body() body: MedicalDeviceWriteBody) {
    const input = await this.normalize(body);
    const device = await this.prisma.medicalDevice.create({
      data: input,
      include: deviceInclude
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "MEDICAL_DEVICE_CREATED",
      entityType: "MedicalDevice",
      entityId: device.id,
      payload: mapDevice(device)
    });
    await this.alerts.syncAlerts("device-created");
    return mapDevice(device);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: MedicalDeviceWriteBody) {
    const existing = await this.prisma.medicalDevice.findUnique({ where: { id }, include: deviceInclude });
    if (!existing) {
      throw new NotFoundException("Gerät nicht gefunden.");
    }
    const input = await this.normalize(body);
    const device = await this.prisma.medicalDevice.update({
      where: { id },
      data: input,
      include: deviceInclude
    });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "MEDICAL_DEVICE_UPDATED",
      entityType: "MedicalDevice",
      entityId: device.id,
      payload: { previous: mapDevice(existing), next: mapDevice(device) }
    });
    await this.alerts.syncAlerts("device-updated");
    return mapDevice(device);
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.medicalDevice.findUnique({ where: { id }, include: deviceInclude });
    if (!existing) {
      throw new NotFoundException("Gerät nicht gefunden.");
    }
    await this.prisma.medicalDevice.delete({ where: { id } });
    await this.audit.record({
      actorType: "USER",
      actorLabel: "Admin",
      action: "MEDICAL_DEVICE_DELETED",
      entityType: "MedicalDevice",
      entityId: existing.id,
      payload: mapDevice(existing)
    });
    await this.alerts.syncAlerts("device-deleted");
    return { ok: true };
  }

  private async normalize(body: MedicalDeviceWriteBody) {
    if (!body.name?.trim() || !body.articleId?.trim()) {
      throw new BadRequestException("Name und Artikel sind erforderlich.");
    }
    const article = await this.prisma.article.findUnique({ where: { id: body.articleId } });
    if (!article) {
      throw new BadRequestException("Artikel nicht gefunden.");
    }
    const hasKit = Boolean(body.kitId?.trim());
    const hasLocation = Boolean(body.locationId?.trim());
    if (hasKit === hasLocation) {
      throw new BadRequestException("Wählen Sie genau einen Lagerort oder einen Rucksack aus.");
    }

    const storage = hasKit
      ? await this.resolveKitStorage(body.kitId as string)
      : await this.resolveLocationStorage(body.locationId as string);
    if (!storage) {
      throw new BadRequestException(hasKit ? "Rucksack nicht gefunden." : "Lagerort nicht gefunden.");
    }

    return {
      name: body.name.trim(),
      articleId: body.articleId,
      locationId: storage.locationId,
      kitId: storage.kitId,
      serialNumber: optionalText(body.serialNumber),
      inventoryNumber: optionalText(body.inventoryNumber),
      lastStkAt: parseDate(body.lastStkAt),
      lastMtkAt: parseDate(body.lastMtkAt),
      stkIntervalMonths: optionalInteger(body.stkIntervalMonths),
      mtkIntervalMonths: optionalInteger(body.mtkIntervalMonths),
      active: body.active ?? true,
      notes: optionalText(body.notes)
    };
  }

  private async resolveKitStorage(kitId: string) {
    const kit = await this.prisma.kit.findFirst({
      where: { id: kitId.trim(), deletedAt: null },
      select: { id: true, locationId: true }
    });
    return kit ? { kitId: kit.id, locationId: kit.locationId } : null;
  }

  private async resolveLocationStorage(locationId: string) {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId.trim(), deletedAt: null },
      select: { id: true }
    });
    return location ? { kitId: null, locationId: location.id } : null;
  }
}

type MedicalDeviceWriteBody = {
  name: string;
  articleId: string;
  locationId?: string;
  kitId?: string;
  serialNumber?: string;
  inventoryNumber?: string;
  lastStkAt?: string | null;
  lastMtkAt?: string | null;
  stkIntervalMonths?: number | null;
  mtkIntervalMonths?: number | null;
  active?: boolean;
  notes?: string;
};

function mapDevice(device: {
  id: string;
  name: string;
  articleId: string;
  locationId: string;
  kitId: string | null;
  serialNumber: string | null;
  inventoryNumber: string | null;
  lastStkAt: Date | null;
  lastMtkAt: Date | null;
  stkIntervalMonths: number | null;
  mtkIntervalMonths: number | null;
  active: boolean;
  notes: string | null;
  article: { id: string; name: string; stkRequired: boolean; mtkRequired: boolean; stkIntervalMonths: number | null; mtkIntervalMonths: number | null };
  location: { id: string; name: string };
  kit: null | { id: string; name: string; code: string; locationId: string; location: { name: string } };
}) {
  return {
    id: device.id,
    name: device.name,
    articleId: device.articleId,
    locationId: device.locationId,
    kitId: device.kitId,
    serialNumber: device.serialNumber,
    inventoryNumber: device.inventoryNumber,
    lastStkAt: device.lastStkAt?.toISOString() ?? null,
    lastMtkAt: device.lastMtkAt?.toISOString() ?? null,
    stkIntervalMonths: device.stkIntervalMonths,
    mtkIntervalMonths: device.mtkIntervalMonths,
    active: device.active,
    notes: device.notes,
    article: {
      id: device.article.id,
      name: device.article.name,
      stkRequired: device.article.stkRequired,
      mtkRequired: device.article.mtkRequired,
      stkIntervalMonths: device.article.stkIntervalMonths,
      mtkIntervalMonths: device.article.mtkIntervalMonths
    },
    location: {
      id: device.location.id,
      name: device.location.name
    },
    kit: device.kit ? {
      id: device.kit.id,
      name: device.kit.name,
      code: device.kit.code,
      locationId: device.kit.locationId,
      locationName: device.kit.location.name
    } : null
  };
}

const deviceInclude = {
  article: true,
  location: true,
  kit: {
    include: {
      location: {
        select: { name: true }
      }
    }
  }
} as const;

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function optionalInteger(value?: number | null) {
  if (value === undefined || value === null) return null;
  const normalized = Math.trunc(Number(value));
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new BadRequestException("Intervalle müssen positive ganze Zahlen sein.");
  }
  return normalized;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Datum ist ungültig.");
  }
  return date;
}
