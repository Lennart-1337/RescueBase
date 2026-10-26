import {
  array,
  boolean,
  decimal,
  entity,
  enumeration,
  integer,
  nullable,
  object,
  ref,
  string,
} from "./helpers.js";
import { qualifications } from "../../services/service-planning/types.js";
export const qualification = enumeration(qualifications);
export const category = enumeration([
  "PERSONNEL",
  "VEHICLE",
  "MATERIAL",
  "OTHER",
]);
const person = {
  name: string,
  active: boolean,
  leader: boolean,
  userId: nullable(string),
  qualifications: array(ref("ServicePersonQualification")),
};
const vehicle = {
  name: string,
  registration: string,
  type: string,
  ready: boolean,
  notes: string,
  active: boolean,
};
const tariff = {
  name: string,
  category,
  unit: string,
  costRate: decimal,
  saleRate: decimal,
  active: boolean,
};
const checklist = { name: string, tasks: array(string), active: boolean };
export const serviceCatalogSchemas = {
  ServiceQualification: qualification,
  ServicePersonQualification: object(
    {
      id: string,
      personId: string,
      qualification,
      validUntil: nullable({ type: "string", format: "date" }),
      recognizedQualifications: array(qualification),
    },
    ["qualification", "validUntil", "recognizedQualifications"],
  ),
  ServicePerson: entity(person),
  ServiceVehicle: entity(vehicle),
  ServiceTariff: entity(tariff),
  ServiceChecklist: entity(checklist),
  ServicePersonWrite: object({ ...person, version: integer }, ["name"]),
  ServiceVehicleWrite: object({ ...vehicle, version: integer }, ["name"]),
  ServiceTariffWrite: object({ ...tariff, version: integer }, [
    "name",
    "category",
    "unit",
    "costRate",
    "saleRate",
  ]),
  ServiceChecklistWrite: object({ ...checklist, version: integer }, [
    "name",
    "tasks",
  ]),
  ServicePermission: object({ servicesManage: boolean }),
  ServicePermissionUser: object({
    id: string,
    displayName: string,
    email: string,
    role: enumeration(["ADMIN", "WAREHOUSE"]),
    servicesManage: boolean,
  }),
  ServiceResourceOption: object(
    { id: string, name: string, status: string, kitId: nullable(string) },
    ["id", "name", "status"],
  ),
  ServiceCatalog: object({
    people: array(ref("ServicePerson")),
    vehicles: array(ref("ServiceVehicle")),
    tariffs: array(ref("ServiceTariff")),
    checklists: array(ref("ServiceChecklist")),
    kits: array(ref("ServiceResourceOption")),
    devices: array(ref("ServiceResourceOption")),
    users: array(object({ id: string, displayName: string })),
  }),
};
