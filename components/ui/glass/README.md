# Sistine Components

This folder contains the main designed components for Sistine. These components are built on top of the base components located in `../` (parent directory).

## Architecture

- **Base Components** (`../`): Foundation components with glassy variants
- **Sistine Components** (`./glass/`): Designed components that use base components with enhanced styling

## Usage

```tsx
import { Button, Card, Input, CardHeader, CardTitle } from "@/components/ui/glass"

// Use Sistine components
<Button effect="glow" variant="glass">
  Click me
</Button>

<Card gradient animated>
  <CardHeader>
    <CardTitle>Beautiful Card</CardTitle>
  </CardHeader>
</Card>
```

## Component Pattern

All Sistine components:
1. Import base components from parent directory
2. Add enhanced styling and effects
3. Maintain the same API as base components
4. Add additional props for design customization

## Available Components

- `Button` - Enhanced button with glow, shimmer, and ripple effects
- `Card` - Card with gradient and animation options
- `Input` - Input with icon support and error states

More components coming soon...

