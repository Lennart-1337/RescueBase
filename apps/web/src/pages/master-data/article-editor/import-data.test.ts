import type { ArticleImportPreview } from "../../../lib/article-import";
import { emptyDraft } from "./draft";
import {
  importCandidates,
  mergeImport,
  matchMeierSupplier,
} from "./import-data";
import { supplier } from "../../../test-support/fixtures";
const preview: ArticleImportPreview = {
  source: "MEIER_MEDIZINTECHNIK" as const,
  sourceUrl: "https://www.meier-medizintechnik.de/p/1",
  fetchedAt: "2026-10-14T12:00:00Z",
  supplierName: "Meier Medizintechnik",
  warnings: [],
  data: {
    name: "Kanülensammler",
    articleUrl: "https://www.meier-medizintechnik.de/p/1",
    supplierArticleNumber: "2009068",
  },
};
describe("article import review", () => {
  it("preserves absent manual fields and offers populated conflicts for explicit selection", () => {
    const draft = {
      ...emptyDraft(),
      name: "Manuell",
      unit: "Packung",
      defaultGrossPrice: "5,00",
    };
    const candidates = importCandidates(preview, draft, []);
    expect(candidates.find((entry) => entry.key === "name")?.selected).toBe(
      false,
    );
    const merged = mergeImport(
      draft,
      draft,
      candidates.map((entry) => ({ ...entry, selected: true })),
    );
    expect(merged.name).toBe("Kanülensammler");
    expect(merged.supplierArticleNumber).toBe("2009068");
    expect(merged.unit).toBe("Packung");
    expect(merged.defaultGrossPrice).toBe("5,00");
  });
  it("preserves fields edited after loading", () => {
    const draft = emptyDraft();
    const current = { ...draft, name: "Neuer manueller Name" };
    expect(
      mergeImport(current, draft, importCandidates(preview, draft, [])).name,
    ).toBe(current.name);
  });
  it("matches only an unambiguous supplier by exact host or normalized name", () => {
    const meier = {
      ...supplier,
      id: "meier",
      name: "Meier Medizintechnik",
      website: "https://www.meier-medizintechnik.de",
    };
    expect(matchMeierSupplier([supplier, meier])?.id).toBe("meier");
    expect(
      matchMeierSupplier([
        { ...meier, website: undefined, name: "Meier-Medizintechnik GmbH" },
      ])?.id,
    ).toBe("meier");
    expect(
      matchMeierSupplier([{ ...supplier, name: "Meier Medizintechnik Fake" }]),
    ).toBeUndefined();
    expect(
      matchMeierSupplier([meier, { ...meier, id: "duplicate" }]),
    ).toBeUndefined();
    expect(
      matchMeierSupplier([
        {
          ...supplier,
          website: "https://meier-medizintechnik.de.attacker.test",
        },
      ]),
    ).toBeUndefined();
  });
});
