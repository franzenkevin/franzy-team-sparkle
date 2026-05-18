import { createFileRoute } from "@tanstack/react-router";
import { LegacyDashboard } from "@/components/admin/LegacyDashboard";
export const Route = createFileRoute("/_authenticated/admin/legacy")({ component: LegacyDashboard });
