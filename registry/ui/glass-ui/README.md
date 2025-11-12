# Glass UI Components

This folder contains the main designed components for Glass UI. These components are built on top of the base components located in `../` (parent directory).

## Architecture

- **Base Components** (`../`): Foundation components with glassy variants
- **Glass UI Components** (`./glass-ui/`): Designed components that use base components with enhanced styling

## Usage

```tsx
import { ChitraButton, ChitraCard, ChitraInput } from "@/registry/ui/glass-ui"

// Use Glass UI components
<ChitraButton effect="glow" variant="glass">
  Click me
</ChitraButton>

<ChitraCard gradient animated>
  <CardHeader>
    <CardTitle>Beautiful Card</CardTitle>
  </CardHeader>
</ChitraCard>
```

## Component Pattern

All Glass UI components:
1. Import base components from parent directory
2. Add enhanced styling and effects
3. Maintain the same API as base components
4. Add additional props for design customization

## Available Components

- `ChitraButton` - Enhanced button with glow, shimmer, and ripple effects
- `ChitraCard` - Card with gradient and animation options
- `ChitraInput` - Input with icon support and error states

More components coming soon...

