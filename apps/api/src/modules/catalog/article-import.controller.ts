import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RateLimit, Roles } from "../../auth/auth.decorators.js";
import { fetchMeierProduct } from "./article-import/fetch.js";
import { parseMeierProduct } from "./article-import/parser.js";
@ApiTags("Stammdaten")
@Roles("ADMIN")
@Controller("catalog/articles")
export class CatalogArticleImportController {
  @Post("import-preview")
  @RateLimit({ limit: 10, windowMs: 60_000 })
  async importPreview(@Body() body: { url?: unknown }) {
    const product = await fetchMeierProduct(body?.url);
    return parseMeierProduct(product.body, product.url);
  }
}
