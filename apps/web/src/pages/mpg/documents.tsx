import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnchorButton, Button, Field } from "../../components/ui";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { useMpg } from "./api";
import { MpgDataTable } from "./data-table";
import { QueryState } from "./shared";
import { displayDate, type Document } from "./types";
export function Documents({ owner, onUploaded }: { owner: { deviceId?: string; modelId?: string; personId?: string }; onUploaded?: (id: string) => Promise<unknown> }) {
  const query = useMpg<Document[]>(`/documents?${new URLSearchParams(owner).toString()}`);
  const client = useQueryClient(); const [file, setFile] = useState<File | null>(null); const [previous, setPrevious] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const columns: DataTableColumn<Document>[] = [{ id: "file", label: "Datei", render: document => <strong>{document.filename}</strong>, sortValue: document => document.filename }, { id: "version", label: "Version", render: document => `v${document.version}`, sortValue: document => document.version, width: "100px" }, { id: "uploaded", label: "Hochgeladen", render: document => displayDate(document.createdAt), sortValue: document => document.createdAt, width: "150px" }, { id: "download", label: "Dokument", render: document => <AnchorButton variant="ghost" href={`/api/mpg/documents/${document.id}`}>Herunterladen</AnchorButton>, width: "150px" }];
  return <section><h3>Dokumente</h3><QueryState query={query} /><MpgDataTable columns={columns} emptyMessage="Noch keine Dokumente hinterlegt." getRowId={document => document.id} rows={query.data ?? []} />
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
