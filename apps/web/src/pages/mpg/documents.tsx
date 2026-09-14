import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnchorButton, Button, Field } from "../../components/ui";
import { useMpg } from "./api";
import { QueryState, MpgTable } from "./shared";
import { displayDate, type Document } from "./types";
export function Documents({ owner, onUploaded }: { owner: { deviceId?: string; modelId?: string; personId?: string }; onUploaded?: (id: string) => Promise<unknown> }) {
  const query = useMpg<Document[]>(`/documents?${new URLSearchParams(owner).toString()}`);
  const client = useQueryClient(); const [file, setFile] = useState<File | null>(null); const [previous, setPrevious] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  return <section><h3>Dokumente</h3><QueryState query={query} /><MpgTable headings={["Datei", "Version", "Hochgeladen", ""]} empty={query.data?.length === 0}>{query.data?.map((document) => <tr key={document.id}><td>{document.filename}</td><td>{document.version}</td><td>{displayDate(document.createdAt)}</td><td><AnchorButton variant="ghost" href={`/api/mpg/documents/${document.id}`}>Herunterladen</AnchorButton></td></tr>)}</MpgTable>
    <form className="mpg-form" onSubmit={async (event) => { event.preventDefault(); if (!file) return; setError(""); setPending(true); try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Die Datei darf höchstens 20 MB groß sein.");
      const body = new FormData(); body.append("file", file); for (const [key, value] of Object.entries(owner)) if (value) body.append(key, value); if (previous) body.append("previousVersionId", previous);
      const response = await fetch("/api/mpg/documents", { method: "POST", credentials: "include", body }); const result = await response.json() as Document & { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Upload fehlgeschlagen."); if (onUploaded) await onUploaded(result.id); await client.invalidateQueries({ queryKey: ["mpg"] }); setFile(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen."); } finally { setPending(false); } }}>
      <Field label="PDF, JPEG oder PNG (max. 20 MB)"><input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Field>
      <Field label="Neue Version von"><select value={previous} onChange={(event) => setPrevious(event.target.value)}><option value="">Neues Dokument</option>{query.data?.map((document) => <option value={document.id} key={document.id}>{document.filename} · v{document.version}</option>)}</select></Field>
      {error ? <p role="alert">{error}</p> : null}<Button loading={pending} disabled={!file} type="submit">Dokument hochladen</Button>
    </form></section>;
}
