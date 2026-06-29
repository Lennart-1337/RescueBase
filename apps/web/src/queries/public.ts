import { queryOptions } from "@tanstack/react-query";
import { rescueBaseApi } from "../lib/api";
import { queryStaleTimes } from "./policies";

export const publicKeys = {
  all: ["public"] as const,
  invitation: (token: string) => [...publicKeys.all, "invitation", token] as const,
  passwordResetPreview: (token: string) => [...publicKeys.all, "password-reset-preview", token] as const,
  publicKit: (token: string) => [...publicKeys.all, "kit", token] as const
};

export const publicQueries = {
  invitation: (token: string) =>
    queryOptions({ queryKey: publicKeys.invitation(token), queryFn: () => rescueBaseApi.invitation(token), staleTime: queryStaleTimes.detail }),
  passwordResetPreview: (token: string) =>
    queryOptions({ queryKey: publicKeys.passwordResetPreview(token), queryFn: () => rescueBaseApi.passwordResetPreview(token), staleTime: queryStaleTimes.detail }),
  publicKit: (token: string) =>
    queryOptions({ queryKey: publicKeys.publicKit(token), queryFn: () => rescueBaseApi.publicKit(token), staleTime: queryStaleTimes.detail })
};
