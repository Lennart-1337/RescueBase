import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
import { SwaggerModule } from "@nestjs/swagger";
import { configureApp } from "../src/app-config";

describe("configureApp", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalPublicUrl = process.env.APP_PUBLIC_URL;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalPublicUrl === undefined) delete process.env.APP_PUBLIC_URL;
    else process.env.APP_PUBLIC_URL = originalPublicUrl;
    jest.restoreAllMocks();
  });

  it("fails production startup without a configured mail provider", () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESEND_API_KEY;

    expect(() => configureApp(testApp())).toThrow("RESEND_API_KEY must be configured in production.");
  });

  it("does not expose Swagger docs by default outside development", () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "re_live_test";
    const setup = jest.spyOn(SwaggerModule, "setup").mockImplementation(() => undefined);

    configureApp(testApp());

    expect(setup).not.toHaveBeenCalled();
  });

  it("exposes Swagger docs in development", () => {
    process.env.NODE_ENV = "development";
    const setup = jest.spyOn(SwaggerModule, "setup").mockImplementation(() => undefined);

    configureApp(testApp());

    expect(setup).toHaveBeenCalled();
  });
});

function testApp(): INestApplication {
  return {
    use: jest.fn(),
    enableCors: jest.fn(),
    useGlobalPipes: jest.fn()
  } as unknown as INestApplication;
}
