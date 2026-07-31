import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { AccountActivationService } from "../auth/account-activation.service.js";
import { PublicRoute, RateLimit } from "../auth/auth.decorators.js";

class ActivateAccountDto {
  @IsString()
  @MinLength(12)
  password!: string;
}

@Controller("activation")
export class AccountActivationController {
  constructor(private readonly activations: AccountActivationService) {}

  @PublicRoute()
  @RateLimit({ limit: 10, windowMs: 10 * 60 * 1000 })
  @Get(":token")
  async preview(@Param("token") token: string) {
    return { valid: await this.activations.isValid(token) };
  }

  @PublicRoute()
  @RateLimit({ limit: 10, windowMs: 10 * 60 * 1000 })
  @Post(":token")
  async activate(@Param("token") token: string, @Body() body: ActivateAccountDto) {
    return { ok: true, userId: await this.activations.activate(token, body.password) };
  }
}
