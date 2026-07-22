import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Save } from "lucide-react";
import { saveMyAlertSubscriptions } from "../../lib/extra-api";
import { InlineError, LoadingPanel } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";
import { alertKeys, alertQueries } from "../../queries/alerts";
import { catalogQueries } from "../../queries/catalog";
import { AlertPreferenceCard, type AlertCategoryOption } from "./alert-preference-card";
import "./account-alerts-panel.css";

const categories: AlertCategoryOption[] = [
  { key: "EXPIRY", label: "Ablauf" },
  { key: "STK_DUE", label: "STK" },
  { key: "MTK_DUE", label: "MTK" },
  { key: "SHORTAGE", label: "Fehlbestand" },
  { key: "KIT_CHECK_DUE", label: "Rucksackprüfung" }
];

export function AccountAlertsPanel() {
  const queryClient = useQueryClient();
  const locations = useQuery(catalogQueries.locations());
  const subscriptions = useQuery(alertQueries.subscriptionsMe());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!subscriptions.data) return;
    setSelected(new Set(subscriptions.data.map((subscription) => subscriptionKey(subscription.category, subscription.locationId))));
  }, [subscriptions.data]);

  const save = useMutation({
    mutationFn: (body: Array<{ category: (typeof categories)[number]["key"]; locationId?: string | null }>) => saveMyAlertSubscriptions(body),
    onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: alertKeys.subscriptionsMe() }), queryClient.invalidateQueries({ queryKey: alertKeys.subscriptions() })])
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
        <div><h2>Alarm-E-Mails</h2></div>
        <BellRing />
      </div>
      <div className="alert-subscription-summary">
        <Badge tone="neutral">{formatRuleCount(selected.size)}</Badge>
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
        <div className="row-actions">
          <Button loading={save.isPending} onClick={submit} type="button">
            <Save data-icon="inline-start" />Speichern
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
