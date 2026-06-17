import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Save } from "lucide-react";
import { rescueBaseApi } from "../../lib/api";
import { getMyAlertSubscriptions, saveMyAlertSubscriptions } from "../../lib/extra-api";
import { InlineError, LoadingPanel } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";

const categories = [
  { key: "EXPIRY" as const, label: "Ablauf" },
  { key: "STK_DUE" as const, label: "STK" },
  { key: "MTK_DUE" as const, label: "MTK" }
];

export function AccountAlertsPanel() {
  const queryClient = useQueryClient();
  const locations = useQuery({ queryKey: ["locations"], queryFn: rescueBaseApi.locations });
  const subscriptions = useQuery({ queryKey: ["alert-subscriptions-me"], queryFn: getMyAlertSubscriptions });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!subscriptions.data) return;
    setSelected(new Set(subscriptions.data.map((subscription) => subscriptionKey(subscription.category, subscription.locationId))));
  }, [subscriptions.data]);

  const save = useMutation({
    mutationFn: (body: Array<{ category: (typeof categories)[number]["key"]; locationId?: string | null }>) => saveMyAlertSubscriptions(body),
    onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["alert-subscriptions-me"] }), queryClient.invalidateQueries({ queryKey: ["alert-subscriptions"] })])
  });

  const locationOptions = locations.data ?? [];
  if (locations.isLoading || subscriptions.isLoading) {
    return <LoadingPanel label="Alarmpräferenzen werden geladen" />;
  }
  if (locations.isError || subscriptions.isError || !locations.data || !subscriptions.data) {
    return <InlineError error={locations.error ?? subscriptions.error ?? new Error("Alarmpräferenzen konnten nicht geladen werden.")} />;
  }

  function toggle(category: (typeof categories)[number]["key"], locationId?: string | null) {
    const key = subscriptionKey(category, locationId);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function submit() {
    const body = [...selected].map((entry) => {
      const [category, locationId] = entry.split(":");
      return { category: category as (typeof categories)[number]["key"], locationId: locationId === "global" ? undefined : locationId };
    });
    save.mutate(body);
  }

  return (
    <Panel>
      <div className="panel-header">
        <div><h2>Alarm-E-Mails</h2><p>Wählen Sie, welche Warnungen Sie global oder standortbezogen erhalten.</p></div>
        <BellRing />
      </div>
      <div className="compact-list-empty" style={{ marginBottom: "0.75rem" }}>Es gibt {selected.size} aktive Alarmregeln.</div>
      <div className="alert-subscription-grid">
        <div className="alert-subscription-head">Kategorie</div>
        <div className="alert-subscription-head">Global</div>
        {locationOptions.map((location) => <div className="alert-subscription-head" key={location.id}>{location.name}</div>)}
        {categories.map((row) => (
          <div className="alert-subscription-row" key={row.key}>
            <div className="alert-subscription-label"><strong>{row.label}</strong></div>
            <label className="alert-subscription-cell">
              <input checked={selected.has(subscriptionKey(row.key, null))} onChange={() => toggle(row.key, null)} type="checkbox" />
              <span>Alle Standorte</span>
            </label>
            {locationOptions.map((location) => (
              <label className="alert-subscription-cell" key={`${row.key}-${location.id}`}>
                <input checked={selected.has(subscriptionKey(row.key, location.id))} onChange={() => toggle(row.key, location.id)} type="checkbox" />
                <span>{location.name}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="form-actions">
        <div className="field"><span>Hinweis</span><div className="field-help">Benutzer erhalten nur E-Mails, wenn sie für die Kategorie mindestens global oder standortbezogen angemeldet sind.</div></div>
        <div className="row-actions"><Badge tone="info">{selected.size} Regeln</Badge><Button disabled={save.isPending} onClick={submit} type="button"><Save data-icon="inline-start" />Speichern</Button></div>
      </div>
      {save.error ? <InlineError error={save.error} /> : null}
    </Panel>
  );
}

function subscriptionKey(category: string, locationId?: string | null) {
  return `${category}:${locationId ?? "global"}`;
}
