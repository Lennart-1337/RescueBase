import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RateLimit, Roles } from "../../auth/auth.decorators.js";
import { searchMeierArticles } from "./meier-search/search.js";
@ApiTags("Stammdaten")
@Roles("ADMIN")
@Controller("catalog/articles")
export class CatalogMeierSearchController {
  @Post("meier-search")
  @RateLimit({ limit: 20, windowMs: 60_000 })
  search(@Body() body: { query?: unknown; page?: unknown }) {
    return searchMeierArticles(body);
  }
}
