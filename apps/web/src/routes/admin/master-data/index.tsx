import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/master-data/")({
  beforeLoad: () => {
    throw redirect({ replace: true, search: {}, to: "/admin/master-data/articles" });
  }
});
