import { useEffect, useLayoutEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const APP_TITLE = "RescueBase";

const routeTitles: Record<string, string> = {
  "/": "Nachfüllaufträge",
  "/admin/account": "Sicherheit",
  "/admin/check-protocols": "Check-Protokolle",
  "/admin/inventory": "Lager",
  "/admin/kits": "Rucksäcke",
  "/admin/master-data": "Stammdaten",
  "/admin/master-data/articles": "Stammdaten · Artikel",
  "/admin/master-data/devices": "Stammdaten · Geräte",
  "/admin/master-data/locations": "Stammdaten · Standorte",
  "/admin/master-data/suppliers": "Stammdaten · Lieferanten",
  "/admin/master-data/templates": "Stammdaten · Vorlagen",
  "/admin/purchase-orders": "Bestellungen",
  "/admin/purchase-orders/": "Bestellungen",
  "/admin/purchase-orders/$orderId": "Bestellung",
  "/admin/purchase-orders/new": "Bestellung anlegen",
  "/admin/settings": "Einstellungen",
  "/admin/users": "Benutzer",
  "/check/$token": "Rucksack-Check",
  "/email-change/$token": "E-Mail-Adresse bestätigen",
  "/invitation/$token": "Einladung annehmen",
  "/legal/imprint": "Impressum",
  "/legal/privacy": "Datenschutzerklärung",
  "/password-reset/": "Passwort zurücksetzen",
  "/password-reset/$token": "Neues Passwort setzen"
};

export function useRouteDocumentTitle() {
  const routeIds = useRouterState({
    select: (state) => state.matches.map((match) => match.routeId)
  });
  const title = resolveRouteTitle(routeIds);

  useLayoutEffect(() => {
    document.title = formatDocumentTitle(title);
  }, [title]);
}

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (!title) return;
    document.title = formatDocumentTitle(title);
  }, [title]);
}

export function formatDocumentTitle(title?: string) {
  return title ? `${title} | ${APP_TITLE}` : APP_TITLE;
}

function resolveRouteTitle(routeIds: ReadonlyArray<string>) {
  for (const routeId of [...routeIds].reverse()) {
    const title = routeTitles[routeId];
    if (title) return title;
  }
  return undefined;
}
