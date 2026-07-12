import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { currentBrowserSubscription, subscribeToPush, supportsBrowserPush, unsubscribeFromPush } from "../../lib/browser-push";
import { deletePushSubscription, getMyPushSubscriptions, getPushConfiguration, savePushSubscription } from "../../lib/extra-api";
import { InlineError } from "../../components/state-panels";
import { Badge, Button, Panel } from "../../components/ui";

export function AccountPushNotificationsPanel() {
  const queryClient = useQueryClient();
  const supported = supportsBrowserPush();
  const configuration = useQuery({ queryKey: ["push", "config"], queryFn: getPushConfiguration, enabled: supported });
  const subscriptions = useQuery({ queryKey: ["push", "subscriptions", "me"], queryFn: getMyPushSubscriptions, enabled: supported });
  const [browserSubscription, setBrowserSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (!supported) return;
    void currentBrowserSubscription().then(setBrowserSubscription).catch(() => setBrowserSubscription(null));
  }, [supported]);

  const active = Boolean(browserSubscription && subscriptions.data?.endpoints.includes(browserSubscription.endpoint));
  const toggle = useMutation({
    mutationFn: async () => {
      if (active && browserSubscription) {
        await deletePushSubscription(browserSubscription.endpoint);
        await unsubscribeFromPush(browserSubscription);
        setBrowserSubscription(null);
        return;
      }
      const publicKey = configuration.data?.publicKey;
      if (!publicKey) throw new Error("Web Push ist auf diesem Server nicht konfiguriert.");
      const subscription = await subscribeToPush(publicKey);
      await savePushSubscription(subscription);
      setBrowserSubscription(await currentBrowserSubscription());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["push", "subscriptions", "me"] })
  });

  const disabled = !supported || !configuration.data?.enabled || configuration.isLoading || toggle.isPending;
  const label = active ? "Push-Benachrichtigungen deaktivieren" : "Push-Benachrichtigungen aktivieren";
  const status = !supported ? "In diesem Browser nicht verfügbar" : !configuration.data?.enabled ? "Server nicht konfiguriert" : active ? "Dieses Gerät ist aktiv" : "Dieses Gerät ist nicht aktiv";

  return (
    <Panel>
      <div className="panel-header"><div><h2>Push-Benachrichtigungen</h2></div><BellRing /></div>
      <div className="auth-form">
        <p>Erhalten Sie neue Alarmmeldungen und Nachfüllaufträge direkt auf diesem Gerät.</p>
        <Badge tone={active ? "ready" : "neutral"}>{status}</Badge>
        <Button disabled={disabled} loading={toggle.isPending} onClick={() => toggle.mutate()} type="button" variant={active ? "secondary" : "primary"}>{label}</Button>
        {!supported ? <p className="debug-hint">Auf iPhone und iPad muss RescueBase zum Home-Bildschirm hinzugefügt werden.</p> : null}
        {toggle.error ? <InlineError error={toggle.error} /> : null}
      </div>
    </Panel>
  );
}
