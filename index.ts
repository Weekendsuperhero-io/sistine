/**
 * OS Glass - Crenspire Glass UI Components
 * Apple Liquid Glass / macOS-inspired theme
 */

// Library utilities
export * from "./lib/glass-utils";
export * from "./lib/utils";

// Glass styles utility for easy access
export const glassStyles = {
  base: "glass-bg blur-glass border border-glass rounded-lg",
  panel: "glass-bg blur-glass-lg border border-glass shadow-glass rounded-xl",
  card: "glass-bg blur-glass border border-glass shadow-glass-sm rounded-lg",
  button: "glass-bg blur-glass-sm border border-glass/50 shadow-glass-sm rounded-md hover:shadow-glass transition-shadow",
  overlay: "fixed inset-0 bg-overlay-bg backdrop-blur-sm",
};

export * from "./components/ui/badge";
export * from "./components/ui/breadcrumb";
// Re-export UI components from the components/ui folder
export * from "./components/ui/button";
export * from "./components/ui/calendar";
export * from "./components/ui/card";
export * from "./components/ui/checkbox";
export * from "./components/ui/command";
export * from "./components/ui/dialog";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/empty-state";
export * from "./components/ui/hover-card";
export * from "./components/ui/input";
export * from "./components/ui/input-group";
export * from "./components/ui/input-otp";
export * from "./components/ui/menu-bar";
export * from "./components/ui/pagination";
export * from "./components/ui/popover";
export * from "./components/ui/scroll-area";
export * from "./components/ui/select";
export * from "./components/ui/separator";
export * from "./components/ui/sheet";
export * from "./components/ui/sidebar";
export * from "./components/ui/skeleton";
export * from "./components/ui/slider";
export * from "./components/ui/table";
export * from "./components/ui/tabs";
export * from "./components/ui/textarea";
export * from "./components/ui/tooltip";
