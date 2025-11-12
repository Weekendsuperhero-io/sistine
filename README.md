# Glass UI

A modern, glassmorphic component library inspired by Apple's design language, built with Next.js 16, React 19, and shadcn-ui registry.

![Glass UI](https://img.shields.io/badge/Glass%20UI-v0.1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![React](https://img.shields.io/badge/React-19.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

## ✨ Features

- 🎨 **40+ Glass Components** - Comprehensive collection of beautiful, glassy UI components
- 🌈 **Apple-Inspired Design** - Glassmorphism effects following Apple's design standards
- 🎭 **Theme Support** - Built-in light/dark mode with automatic theme switching
- ⚡ **Enhanced Effects** - Glow, shimmer, ripple, and gradient animations
- 🎯 **Fully Customizable** - Per-component glass effect customization
- 📦 **Package Manager Support** - Install with pnpm, yarn, npm, or bun
- 🔧 **TypeScript** - Fully typed components for better developer experience
- ♿ **Accessible** - Built on Radix UI primitives for accessibility
- 🎨 **Tailwind CSS** - Utility-first styling with CSS variables

## 🚀 Quick Start

### Installation

Install components using the shadcn CLI with your preferred package manager:

**pnpm:**
```bash
pnpm dlx shadcn@latest add @crenspire/button
```

**yarn:**
```bash
yarn dlx shadcn@latest add @crenspire/button
```

**npm:**
```bash
npx shadcn@latest add @crenspire/button
```

**bun:**
```bash
bunx shadcn@latest add @crenspire/button
```

### Usage

After installation, import and use components in your project:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function Example() {
  return (
    <div>
      <Button variant="glass" effect="glow">
        Click me
      </Button>
      <Card variant="glass" gradient animated>
        <CardHeader>
          <CardTitle>Beautiful Card</CardTitle>
        </CardHeader>
        <CardContent>Your content here</CardContent>
      </Card>
    </div>
  )
}
```

> **Note:** The import path depends on your project's component directory configuration. By default, shadcn CLI installs components to `@/components/ui/`.

## 📚 Documentation

Visit the [full documentation](https://glass-ui.crenspire.com) for:
- Complete component reference
- Installation guides
- Customization examples
- Theme configuration
- Glass effect customization

## 🏗️ Architecture

Glass UI follows a two-layer component architecture:

### Base Components (`registry/ui/`)
Foundation components with glassy variants providing:
- Core functionality
- Glassy effect variants
- Accessibility features (Radix UI)
- TypeScript support

### Glass UI Components (`registry/ui/glass/`)
Enhanced components built on top of base components with:
- Enhanced visual effects (glow, shimmer, ripple)
- Advanced styling options
- Gradient and animation support
- Custom design patterns

## 🎨 Customization

### Global CSS Variables

Customize glass effects globally using CSS variables:

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.25);
  --glass-border: rgba(255, 255, 255, 0.18);
  --blur: 30px;
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.dark {
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
}
```

### Per-Component Customization

```tsx
<Card
  variant="glass"
  glass={{
    color: "rgba(139, 92, 246, 0.2)",
    blur: 30,
    transparency: 0.3,
    outline: "rgba(139, 92, 246, 0.5)"
  }}
>
  Content
</Card>
```

## 📦 Available Components

### Form Components
- Button, Input, Textarea, Label
- Checkbox, Switch, Radio Group
- Select, Input OTP

### Display Components
- Card, Badge, Avatar, Alert
- Skeleton, Separator, Table

### Overlay Components
- Dialog, Alert Dialog, Popover
- Tooltip, Hover Card, Sheet
- Drawer, Sidebar

### Navigation Components
- Tabs, Accordion, Breadcrumb
- Dropdown Menu, Navigation Menu
- Pagination, Scroll Area

### Data Display
- Calendar, Chart, Command
- Slider, Toggle, Toggle Group

And more! See the [full component list](https://glass-ui.crenspire.com/components).

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- pnpm, yarn, npm, or bun

### Setup

```bash
# Clone the repository
git clone https://github.com/crenspire/glass-ui.git
cd glass-ui

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build the project
pnpm build

# Build the registry
pnpm registry:build
```

### Project Structure

```
glass-ui/
├── app/                    # Next.js app directory
├── components/             # Shared components
├── lib/                    # Utilities and helpers
├── public/                 # Static assets
├── registry/
│   ├── ui/                # Base components
│   └── ui/glass/          # Glass UI components
└── registry.json          # Component registry
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Documentation](https://glass-ui.crenspire.com)
- [GitHub Repository](https://github.com/crenspire/glass-ui)
- [Issue Tracker](https://github.com/crenspire/glass-ui/issues)

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com)
- Powered by [Radix UI](https://www.radix-ui.com)
- Inspired by Apple's design language

---

Made with ❤️ by [Crenspire Technologies](https://crenspire.com)
