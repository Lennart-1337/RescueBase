import { queryOptions } from "@tanstack/react-query";
import { listMedicalDevices } from "../lib/extra-api";
import { queryStaleTimes } from "./policies";

export const deviceKeys = {
  all: ["medical-devices"] as const,
  list: () => [...deviceKeys.all, "list"] as const
};

export const deviceQueries = {
  list: () => queryOptions({ queryKey: deviceKeys.list(), queryFn: listMedicalDevices, staleTime: queryStaleTimes.reference })
};
