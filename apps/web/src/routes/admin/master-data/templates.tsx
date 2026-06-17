import { createFileRoute } from "@tanstack/react-router";
import { MasterDataTemplatePage } from "../../../pages/master-data/template-page";

export const Route = createFileRoute("/admin/master-data/templates")({
  component: MasterDataTemplatesRoute
});

function MasterDataTemplatesRoute() {
  return <MasterDataTemplatePage />;
}
