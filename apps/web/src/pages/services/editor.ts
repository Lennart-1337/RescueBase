import type { Catalog, Service, ServiceWrite } from "./types";
export type ServiceEditorProps = {
  service: Service;
  catalog: Catalog;
  save: (body: Partial<ServiceWrite>) => Promise<unknown>;
  locked: boolean;
};
export const newId = () => crypto.randomUUID();
