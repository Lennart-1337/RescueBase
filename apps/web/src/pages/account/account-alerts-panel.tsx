import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Save } from "lucide-react";
import { rescueBaseApi } from "../../lib/api";
import { getMyAlertSubscriptions, saveMyAlertSubscriptions } from "../../lib/extra-api";
import { InlineError, LoadingPanel } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";
import { AlertPreferenceCard, type AlertCategoryOption } from "./alert-preference-card";

const categories: AlertCategoryOption[] = [
  { key: "EXPIRY", label: "Ablauf", description: "Warnungen zu Artikeln, die bald ablaufen oder abgelaufen sind." },
  { key: "STK_DUE", label: "STK", description: "Erinnerungen für fällige sicherheitstechnische Kontrollen." },
  { key: "MTK_DUE", label: "MTK", description: "Erinnerungen für fällige messtechnische Kontrollen." }
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
        <div>
          <h2>Alarm-E-Mails</h2>
          <p>Wählen Sie pro Alarmtyp, ob Sie alle Standorte oder nur einzelne Standorte abonnieren.</p>
        </div>
        <BellRing />
      </div>
      <div className="alert-subscription-summary">
        <Badge tone={selected.size > 0 ? "info" : "neutral"}>{formatRuleCount(selected.size)}</Badge>
        <span>Globale Regeln gelten auch für künftig angelegte Standorte.</span>
      </div>
      <div className="alert-category-grid">
        {categories.map((category) => (
          <AlertPreferenceCard
            category={category}
            key={category.key}
            locations={locationOptions}
            onToggle={toggle}
            selected={selected}
            subscriptionKey={subscriptionKey}
          />
        ))}
      </div>
      <div className="form-actions alert-actions">
        <div className="field">
          <span>Hinweis</span>
          <div className="field-help">E-Mails werden nur für aktivierte Alarmtypen und die ausgewählten Standorte gesendet.</div>
        </div>
        <div className="row-actions">
          <Button disabled={save.isPending} onClick={submit} type="button">
            <Save data-icon="inline-start" />{save.isPending ? "Speichert..." : "Speichern"}
          </Button>
        </div>
      </div>
      {save.error ? <InlineError error={save.error} /> : null}
    </Panel>
  );
}

function subscriptionKey(category: string, locationId?: string | null) {
  return `${category}:${locationId ?? "global"}`;
}

function formatRuleCount(count: number) {
  return count === 1 ? "1 Regel aktiv" : `${count} Regeln aktiv`;
}
