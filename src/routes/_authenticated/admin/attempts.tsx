import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/attempts")({
  component: AttemptsLayout,
});

function AttemptsLayout() {
  return <Outlet />;
}