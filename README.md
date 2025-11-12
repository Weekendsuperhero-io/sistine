
# Glass UI
A modern, glassmorphic component library inspired by Apple's design language, built with shadcn-ui registry.

## Architecture

Glass UI follows a two-layer component architecture:

### Base Components (`registry/ui/`)
Foundation components with glassy variants. These are the building blocks that provide:
- Core functionality
- Glassy effect variants
- Accessibility features
- TypeScript support

### Glass UI Components (`registry/ui/glass-ui/`)
Designed components built on top of base components with:
- Enhanced visual effects (glow, shimmer, ripple)
- Advanced styling options
- Gradient and animation support
- Custom design patterns

## Getting Started

### Using Base Components

```tsx
import { Button } from "@/registry/ui/button"
import { Card } from "@/registry/ui/card"

<Button variant="glass">Click me</Button>
<Card variant="glass">Content</Card>
```

### Using Glass UI Components

```tsx
import { ChitraButton, ChitraCard } from "@/registry/ui/glass-ui"

<ChitraButton effect="glow" variant="glass">
  Click me
</ChitraButton>

<ChitraCard gradient animated>
  <CardHeader>
    <CardTitle>Beautiful Card</CardTitle>
  </CardHeader>
</ChitraCard>
```

## Registry Structure

- **Registry Name**: `crenspire/glass-ui`
- **Base Components**: `registry/ui/`
- **Designed Components**: `registry/ui/glass-ui/`

## Building the Registry

```bash
pnpm registry:build
```

This will build the registry and serve components as static files under `public/r/[name].json`.

## Documentation

Visit the [shadcn documentation](https://ui.shadcn.com/docs/registry) to view the full documentation.
