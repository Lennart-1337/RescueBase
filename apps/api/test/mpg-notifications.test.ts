import { jest } from "@jest/globals";
import type { PrismaService } from "../src/persistence/prisma.service.js";
import type { MailService } from "../src/services/mail.service.js";
import type { PushService } from "../src/services/push.service.js";
import { MpgNotificationsService } from "../src/services/mpg-notifications.service.js";

describe("MPG notification delivery", () => {
  it("does not access recipients or send messages outside production", async () => {
    const findMany = jest.fn();
    const database = { medicalDevice: { findMany } } as unknown as PrismaService;
    const service = new MpgNotificationsService(database, {} as MailService, {} as PushService);

    await service.scan();

    expect(findMany).not.toHaveBeenCalled();
  });
});
