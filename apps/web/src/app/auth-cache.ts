import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { authKeys } from "../queries/auth";

function isSetupStatusQuery(queryKey: QueryKey) {
  return queryKey[0] === "auth" && queryKey[1] === "setup-status";
}

export async function clearAccountQueries(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.removeQueries({
    predicate: (query) => !isSetupStatusQuery(query.queryKey) && query.queryKey[0] !== "auth"
  });
}

export function setSignedOutSession(queryClient: QueryClient) {
  queryClient.setQueryData(authKeys.session(), {});
}
