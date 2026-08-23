/**
 * Block catalogue: the route-key -> {title, description, component, code} map, plus the registry-name
 * overrides. Deliberately NOT a "use client" module so `page.tsx` (a Server Component) can read its
 * KEYS for generateStaticParams while `block-view.tsx` consumes the whole object on the client.
 * Deriving the slugs from this object rather than restating them is the point: two of the seven use
 * quoted keys ("forgot-password", "data-table"), so a hand-kept list drifts silently.
 */
import { AuthenticationBlock } from "@/components/blocks/authentication";
import { CalendarBlock } from "@/components/blocks/calendar";
import { ChartBlock } from "@/components/blocks/chart";
import { DashboardBlock } from "@/components/blocks/dashboard";
import { DataTableBlock } from "@/components/blocks/data-table";
import { ForgotPasswordBlock } from "@/components/blocks/forgot-password";
import { SignupBlock } from "@/components/blocks/signup";

export const blocks = {
  dashboard: {
    title: "Dashboard",
    description: "Complete dashboard layout with stats, charts, and navigation",
    component: DashboardBlock,
    code: `import { DashboardBlock } from "@/components/blocks/dashboard"

export default function Page() {
  return <DashboardBlock />
}`,
  },
  authentication: {
    title: "Authentication",
    description: "Login form with glassmorphism effects",
    component: AuthenticationBlock,
    code: `import { AuthenticationBlock } from "@/components/blocks/authentication"

export default function Page() {
  return <AuthenticationBlock />
}`,
  },
  signup: {
    title: "Sign Up",
    description: "Registration form with validation",
    component: SignupBlock,
    code: `import { SignupBlock } from "@/components/blocks/signup"

export default function Page() {
  return <SignupBlock />
}`,
  },
  "forgot-password": {
    title: "Forgot Password",
    description: "Password reset form",
    component: ForgotPasswordBlock,
    code: `import { ForgotPasswordBlock } from "@/components/blocks/forgot-password"

export default function Page() {
  return <ForgotPasswordBlock />
}`,
  },
  calendar: {
    title: "Calendar",
    description: "Calendar view with events and scheduling",
    component: CalendarBlock,
    code: `import { CalendarBlock } from "@/components/blocks/calendar"

export default function Page() {
  return <CalendarBlock />
}`,
  },
  chart: {
    title: "Chart",
    description: "Beautiful charts with bar, line, and area visualizations",
    component: ChartBlock,
    code: `import { ChartBlock } from "@/components/blocks/chart"

export default function Page() {
  return <ChartBlock />
}`,
  },
  "data-table": {
    title: "Data Table",
    description: "Sortable, filterable table with pagination on the glass Table",
    component: DataTableBlock,
    code: `import { DataTableBlock } from "@/components/blocks/data-table"

export default function Page() {
  return <DataTableBlock />
}`,
  },
};

// Blocks whose registry item name differs from the route key: "calendar"/"chart" collide with
// the calendar/chart components, so they ship as "<name>-block" in the @sistine registry.
export const REGISTRY_NAMES: Record<string, string> = {
  calendar: "calendar-block",
  chart: "chart-block",
};
