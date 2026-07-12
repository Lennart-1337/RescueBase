import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";

export class FirstAdminDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Length(1, 120) displayName!: string;
  @IsString() @MinLength(12) @MaxLength(256) password!: string;
}

export class LoginDto {
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(256) password?: string;
  @IsOptional() @Matches(/^\d{6}$/) twoFactorCode?: string;
  @IsOptional() @IsString() @MaxLength(128) emailChallengeId?: string;
  @IsOptional() @IsString() @MaxLength(128) loginChallengeId?: string;
}

export class InvitationAcceptDto {
  @IsString() @Length(32, 128) token!: string;
  @IsString() @MinLength(12) @MaxLength(256) password!: string;
  @IsOptional() @IsString() @Length(1, 120) displayName?: string;
}

export class PasswordResetRequestDto {
  @IsEmail() @MaxLength(254) email!: string;
}

export class PasswordResetConfirmDto {
  @IsString() @Length(32, 128) token!: string;
  @IsString() @MinLength(12) @MaxLength(256) password!: string;
}

export class CurrentPasswordDto {
  @IsString() @MaxLength(256) currentPassword!: string;
}

export class TotpEnableDto {
  @Matches(/^\d{6}$/) code!: string;
}

export class EmailTwoFactorEnableDto extends CurrentPasswordDto {
  @IsString() @Length(1, 128) challengeId!: string;
  @Matches(/^\d{6}$/) code!: string;
}

export class OrderNotificationsDto {
  @IsBoolean() enabled!: boolean;
}

export class UserActiveDto {
  @IsBoolean() active!: boolean;
}

export class UserRoleDto {
  @IsIn(["ADMIN", "WAREHOUSE"]) role!: "ADMIN" | "WAREHOUSE";
}

export class InviteUserDto extends UserRoleDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Length(1, 120) displayName!: string;
}
