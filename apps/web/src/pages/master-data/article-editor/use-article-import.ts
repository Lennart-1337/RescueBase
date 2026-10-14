import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { rescueBaseApi } from "../../../lib/api";
import type { Supplier } from "../../../lib/types";
import type { ArticleDraft } from "./draft";
import {
  importCandidates,
  matchMeierSupplier,
  mergeImport,
  type Candidate,
} from "./import-data";
type Review = {
  draft: ArticleDraft;
  candidates: Candidate[];
  warnings: string[];
};
export function useArticleImport({
  draft,
  setDraft,
  suppliers,
}: {
  draft: ArticleDraft;
  setDraft: Dispatch<SetStateAction<ArticleDraft>>;
  suppliers: Supplier[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const current = useRef(draft);
  current.current = draft;
  useEffect(() => {
    generation.current++;
    setReview(null);
    setError("");
    setNotice("");
    setLoading(false);
    return () => {
      generation.current++;
    };
  }, [draft.articleUrl]);
  async function load() {
    const id = ++generation.current;
    const snapshot = { ...draft };
    setLoading(true);
    setError("");
    setReview(null);
    setNotice("");
    try {
      const preview = await rescueBaseApi.articleImportPreview(
        snapshot.articleUrl,
      );
      if (
        id !== generation.current ||
        current.current.articleUrl !== snapshot.articleUrl
      )
        return;
      const warnings = [...preview.warnings];
      if (!matchMeierSupplier(suppliers))
        warnings.push(
          "Kein eindeutiger Lieferant „Meier Medizintechnik“ vorhanden. Standard-Lieferant bitte selbst auswählen.",
        );
      if (!preview.data.unit)
        warnings.push(
          "Einheit wurde nicht gefunden. Vorhandene Einheit bleibt erhalten.",
        );
      if (preview.data.defaultGrossPriceCents === undefined)
        warnings.push(
          "Preis wurde nicht gefunden. Vorhandener Preis bleibt erhalten.",
        );
      setReview({
        draft: snapshot,
        candidates: importCandidates(preview, snapshot, suppliers),
        warnings: [...new Set(warnings)],
      });
    } catch (error) {
      if (id === generation.current)
        setError(
          error instanceof Error
            ? error.message
            : "Produktdaten konnten nicht geladen werden.",
        );
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }
  function apply() {
    if (!review) return;
    const skipped = review.candidates.some(
      (entry) =>
        entry.selected &&
        current.current[entry.key] !== review.draft[entry.key],
    );
    setDraft((value) => mergeImport(value, review.draft, review.candidates));
    setReview(null);
    setNotice(
      skipped
        ? "Daten übernommen. Zwischenzeitlich bearbeitete Felder bleiben erhalten. Bitte prüfen und anschließend speichern."
        : "Daten übernommen. Bitte prüfen und anschließend speichern.",
    );
  }
  return { loading, error, review, notice, load, apply, setReview };
}
