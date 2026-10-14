import { useEffect, useRef, useState } from "react";
import { rescueBaseApi } from "../../../lib/api";
import type { MeierSearchResult } from "../../../lib/article-search";
export function useArticleSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MeierSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const lastRequest = useRef({ query: "", page: 1 });
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  function invalidate() {
    generation.current += 1;
    setResult(null);
    setError(null);
    setLoading(false);
  }
  function changeQuery(value: string) {
    invalidate();
    setQuery(value);
  }
  function close() {
    invalidate();
    setOpen(false);
  }
  async function search(page = 1, requestedQuery = query.trim()) {
    if (requestedQuery.length < 2 || requestedQuery.length > 120) return;
    const requestId = ++generation.current;
    lastRequest.current = { query: requestedQuery, page };
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const next = await rescueBaseApi.meierArticleSearch(lastRequest.current);
      if (requestId === generation.current) setResult(next);
    } catch (cause) {
      if (requestId === generation.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Die Meier-Suche ist fehlgeschlagen.",
        );
    } finally {
      if (requestId === generation.current) setLoading(false);
    }
  }
  return {
    open,
    setOpen,
    query,
    changeQuery,
    result,
    error,
    loading,
    close,
    search,
    valid: query.trim().length >= 2 && query.trim().length <= 120,
    retry: () => search(lastRequest.current.page, lastRequest.current.query),
  };
}
