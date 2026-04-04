# Glassmorphism Customization Guide

Glass UI components support full customization of glassmorphism effects. You can override color, transparency, blur, and outline to create custom glass-like effects.

## GlassCustomization Interface

```typescript
interface GlassCustomization {
  /**
   * Background color for the glass effect (e.g., "oklch(100% 0 0 / 0.1)")
   * Default: uses CSS variable --glass-bg
   */
  color?: string
  
  /**
   * Transparency/opacity for the background (0-1)
   * If provided, will override the alpha channel in color
   */
  transparency?: number
  
  /**
   * Blur amount in pixels
   * Default: uses CSS variable --blur (20px)
   */
  blur?: number | string
  
  /**
   * Border/outline color (e.g., "oklch(100% 0 0 / 0.25)")
   * Default: uses CSS variable --glass-border
   */
  outline?: string
  
  /**
   * Border/outline width in pixels
   * Default: 1px
   */
  outlineWidth?: number | string
  
  /**
   * Shadow for the glass effect
   * Default: uses CSS variable --glass-shadow
   */
  shadow?: string
}
```

## Usage Examples

### Basic Card with Custom Glass Effect

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/glass"

<Card 
  glass={{
    color: "oklch(60.5631% 0.218915 292.717225 / 0.2)",  // Purple tint
    blur: 30,                                              // 30px blur
    transparency: 0.3,                                     // 30% opacity
    outline: "oklch(60.5631% 0.218915 292.717225 / 0.5)", // Purple border
    outlineWidth: 2                                        // 2px border
  }}
>
  <CardHeader>
    <CardTitle>Custom Glass Card</CardTitle>
  </CardHeader>
  <CardContent>
    This card has a custom purple glass effect!
  </CardContent>
</Card>
```

### Button with Blue Glass Effect

```tsx
import { Button } from "@/components/ui/glass"

<Button 
  glass={{
    color: "oklch(62.3083% 0.188015 259.814527 / 0.2)",                  // Blue tint
    blur: 25,                                                             // 25px blur
    outline: "oklch(62.3083% 0.188015 259.814527 / 0.4)",                // Blue border
    shadow: "0 8px 32px oklch(62.3083% 0.188015 259.814527 / 0.3)"      // Custom shadow
  }}
>
  Click Me
</Button>
```

### Input with Subtle Glass Effect

```tsx
import { Input } from "@/components/ui/glass"

<Input 
  glass={{
    color: "oklch(100% 0 0 / 0.15)",   // Light white
    blur: 15,                            // Subtle blur
    outline: "oklch(100% 0 0 / 0.3)",   // Light border
    transparency: 0.2                    // 20% opacity
  }}
  placeholder="Enter your email..."
/>
```

### Dialog with Strong Glass Effect

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/glass"

<Dialog>
  <DialogTrigger>Open Dialog</DialogTrigger>
  <DialogContent 
    glass={{
      color: "oklch(60.5631% 0.218915 292.717225 / 0.15)",           // Purple tint
      blur: 40,                                                       // Strong blur
      outline: "oklch(60.5631% 0.218915 292.717225 / 0.3)",          // Purple border
      shadow: "0 12px 48px oklch(60.5631% 0.218915 292.717225 / 0.4)" // Custom shadow
    }}
  >
    <DialogHeader>
      <DialogTitle>Custom Glass Dialog</DialogTitle>
    </DialogHeader>
    <p>This dialog has a custom glass effect!</p>
  </DialogContent>
</Dialog>
```

### Using Hex Colors

```tsx
<Card 
  glass={{
    color: "#ffffff",      // White in hex
    transparency: 0.1,    // Will convert to oklch(100% 0 0 / 0.1)
    blur: 20,
    outline: "#3b82f6"     // Blue in hex
  }}
>
  Content
</Card>
```

### Using Base Components

You can also use the `glass` prop directly on base components:

```tsx
import { Card, Button, Input } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

<Card 
  variant="glass"
  glass={{
    color: "oklch(100% 0 0 / 0.1)",
    blur: 25,
    outline: "oklch(100% 0 0 / 0.25)"
  }}
>
  Content
</Card>

<Button 
  variant="glass"
  glass={{
    blur: 30,
    transparency: 0.2
  }}
>
  Button
</Button>

<Input 
  variant="glass"
  glass={{
    color: "#ffffff",
    transparency: 0.15,
    blur: 15
  }}
/>
```

## Color Formats Supported

- **OKLCH**: `"oklch(100% 0 0 / 0.1)"` (preferred)
- **Hex**: `"#ffffff"` (converted to oklch internally)
- **RGBA**: `"rgba(255, 255, 255, 0.1)"` (converted to oklch internally)
- **RGB**: `"rgb(255, 255, 255)"` (use with `transparency` prop)
- **Named colors**: `"white"` (use with `transparency` prop)

## Blur Values

- **Number**: `blur: 20` (converted to `20px`)
- **String**: `blur: "20px"` or `blur: "1rem"`

## Best Practices

1. **Transparency**: Keep transparency between 0.1-0.3 for best visibility
2. **Blur**: Use 15-30px for subtle effects, 30-50px for stronger effects
3. **Color**: Match glass color to your theme for cohesive design
4. **Outline**: Use slightly more opaque outline than background for definition
5. **Shadow**: Custom shadows can add depth and make glass effect more pronounced

## Component Support

The following components support glass customization:

- ✅ Card (base & glass-ui)
- ✅ Button (base & glass-ui)
- ✅ Input (base & glass-ui)
- ✅ Dialog (base & glass-ui)
- ✅ Textarea
- ✅ Badge
- ✅ Alert
- ✅ And more...

All components with `variant="glass"` support the `glass` prop for customization.
