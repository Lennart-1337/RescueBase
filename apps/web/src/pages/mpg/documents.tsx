import { useId, useState } from "react";
import { Download, Upload, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { DataTableColumn } from "../../components/data-table/data-table";
import { AnchorButton, Button, Dialog, Field } from "../../components/ui";
import { useMpg } from "./api";
import { MpgDataTable } from "./data-table";
import { QueryState } from "./shared";
import { displayDate, type Document } from "./types";

export function Documents({ owner, onUploaded }: { owner: { deviceId?: string; modelId?: string; personId?: string }; onUploaded?: (id: string) => Promise<unknown> }) {
  const query = useMpg<Document[]>(`/documents?${new URLSearchParams(owner).toString()}`); const client = useQueryClient(); const formId = useId();
  const [open, setOpen] = useState(false); const [file, setFile] = useState<File | null>(null); const [previous, setPrevious] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const columns: DataTableColumn<Document>[] = [{ id: "file", label: "Datei", render: document => <strong>{document.filename}</strong>, sortValue: document => document.filename }, { id: "version", label: "Version", render: document => `v${document.version}`, sortValue: document => document.version, width: "100px" }, { id: "uploaded", label: "Hochgeladen", render: document => displayDate(document.createdAt), sortValue: document => document.createdAt, width: "150px" }, { id: "download", label: "Dokument", render: document => <AnchorButton variant="ghost" href={`/api/mpg/documents/${document.id}`}><Download data-icon="inline-start" />Herunterladen</AnchorButton>, width: "170px" }];
  const close = () => { if (!pending) { setOpen(false); setError(""); } };
  const upload = async () => {
    if (!file) return; setError(""); setPending(true);
    try { if (file.size > 20 * 1024 * 1024) throw new Error("Die Datei darf höchstens 20 MB groß sein."); const body = new FormData(); body.append("file", file); for (const [key, value] of Object.entries(owner)) if (value) body.append(key, value); if (previous) body.append("previousVersionId", previous); const response = await fetch("/api/mpg/documents", { method: "POST", credentials: "include", body }); const result = await response.json() as Document & { message?: string }; if (!response.ok) throw new Error(result.message ?? "Upload fehlgeschlagen."); if (onUploaded) await onUploaded(result.id); await client.invalidateQueries({ queryKey: ["mpg"] }); setFile(null); setPrevious(""); setOpen(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen."); } finally { setPending(false); }
  };
  return <section className="mpg-subsection"><header className="mpg-section-header"><div><h3>Dokumente</h3><p>PDF, JPEG oder PNG bis 20 MB</p></div><Button onClick={() => setOpen(true)} type="button" variant="secondary"><Upload data-icon="inline-start" />Dokument hochladen</Button></header><QueryState query={query} /><MpgDataTable columns={columns} emptyMessage="Noch keine Dokumente hinterlegt." getRowId={document => document.id} rows={query.data ?? []} />
    <Dialog actions={<><Button disabled={pending} onClick={close} type="button" variant="ghost"><X data-icon="inline-start" />Abbrechen</Button><Button disabled={!file} form={formId} loading={pending} type="submit"><Upload data-icon="inline-start" />Dokument hochladen</Button></>} onClose={close} open={open} title="Dokument hochladen"><form className="mpg-form" id={formId} onSubmit={(event) => { event.preventDefault(); void upload(); }}><div className="mpg-fields"><Field label="Datei" required><input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Field><Field label="Neue Version von"><select value={previous} onChange={(event) => setPrevious(event.target.value)}><option value="">Neues Dokument</option>{query.data?.map(document => <option value={document.id} key={document.id}>{document.filename} · v{document.version}</option>)}</select></Field></div>{error ? <p className="mpg-error" role="alert">{error}</p> : null}</form></Dialog>
  </section>;
}
