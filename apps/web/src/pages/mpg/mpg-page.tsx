import { useQueries } from "@tanstack/react-query";
import { Tabs } from "../../components/ui";
import { PageHeader } from "../../components/page-layout";
import { rescueBaseApi } from "../../lib/api";
import { Cylinders } from "./cylinders";
import { Deadlines } from "./deadlines";
import { DeviceDetail } from "./device-detail";
import { Devices, type Catalog } from "./devices";
import { People } from "./people";
import { QueryState } from "./shared";
import { Trainings } from "./trainings";
import { useMpg } from "./api";
import type { Cylinder, Device, Model, Person, Training } from "./types";
import "./mpg.css";

export type MpgView = "devices" | "deadlines" | "trainings" | "people" | "cylinders";
export function MpgPage({ view, deviceId, onView, isAdmin }: { view: MpgView; deviceId?: string; onView: (view: MpgView) => void; isAdmin?: boolean }) {
  const devices = useMpg<Device[]>("/devices"), models = useMpg<Model[]>("/models"), people = useMpg<Person[]>("/people");
  const trainings = useMpg<Training[]>("/trainings"), cylinders = useMpg<Cylinder[]>("/cylinders");
  const [locations, kits, articles] = useQueries({ queries: [
    { queryKey: ["catalog", "locations"], queryFn: rescueBaseApi.locations },
    { queryKey: ["catalog", "kits"], queryFn: rescueBaseApi.kits },
    { queryKey: ["catalog", "articles"], queryFn: rescueBaseApi.articles }
  ] });
  const all = [devices, models, people, trainings, cylinders, locations, kits, articles];
  const pending = all.some(query => query.isPending), error = all.find(query => query.error)?.error;
  if (pending || error) return <QueryState query={{ isPending: pending, error, refetch: async () => { await Promise.all(all.map(query => query.refetch())); } } as never} />;
  const catalog: Catalog = { locations: locations.data!, kits: kits.data!, articles: articles.data!, people: people.data!, models: models.data! };
  return <main className="mpg-layout"><PageHeader title="MPG" description="Medizinprodukte, Betreiberpflichten und Nachweise zentral verwalten." />
    <Tabs label="MPG-Bereiche" value={view} onChange={value => onView(value as MpgView)} items={[
      { value: "devices", label: "Geräte" }, { value: "deadlines", label: "Termine" }, { value: "trainings", label: "Einweisungen" }, { value: "people", label: "Personen" }, { value: "cylinders", label: "Sauerstoffflaschen" }
    ]} />
    {deviceId ? <DeviceDetail id={deviceId} catalog={catalog} /> : view === "devices" ? <Devices devices={devices.data!} catalog={catalog} />
      : view === "deadlines" ? <Deadlines devices={devices.data!} />
        : view === "trainings" ? <Trainings catalog={catalog} devices={devices.data!} trainings={trainings.data!} />
          : view === "people" ? <People people={people.data!} isAdmin={isAdmin} />
            : <Cylinders cylinders={cylinders.data!} devices={devices.data!} locations={locations.data!} />}
  </main>;
}
