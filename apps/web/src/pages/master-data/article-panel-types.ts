import type { ReactNode } from "react";
import type {
  Article,
  CreateArticleRequest,
  Supplier,
  UpdateArticleRequest,
} from "../../lib/types";
import type { ReorderDirection } from "./reorder";
import type { ArticleFilters } from "./types";
export type ArticlePanelProps = {
  articles: Article[];
  allArticles?: Article[];
  error: Error | null;
  filters: ArticleFilters;
  isSubmitting: boolean;
  onFilterChange: (patch: Partial<ArticleFilters>) => void;
  onResetFilters: () => void;
  onCreate: (body: CreateArticleRequest) => Promise<unknown>;
  onDelete: (id: string) => void;
  onMoveArticle: (id: string, direction: ReorderDirection) => Promise<unknown>;
  onSave: (id: string, body: UpdateArticleRequest) => Promise<unknown>;
  suppliers: Supplier[];
  totalCount: number;
  reconciliationAction?: ReactNode;
};
