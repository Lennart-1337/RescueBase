import { compare, hash } from "bcryptjs";
import { verifyPassword as verifyBetterAuthPassword } from "better-auth/crypto";

export function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (passwordHash.startsWith("$2")) {
    return compare(password, passwordHash);
  }
  return verifyBetterAuthPassword({ hash: passwordHash, password });
}
