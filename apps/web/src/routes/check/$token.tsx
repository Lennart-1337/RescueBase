import { createFileRoute } from "@tanstack/react-router";
import { PublicCheck } from "../../pages/public-check-page";
import { publicQueries } from "../../queries/public";

export const Route = createFileRoute("/check/$token")({
  loader: ({ context, params }) => context.queryClient.prefetchQuery(publicQueries.publicKit(params.token)),
  component: PublicCheckRoute
});

function PublicCheckRoute() {
  const { token } = Route.useParams();
  return <PublicCheck token={token} />;
}
