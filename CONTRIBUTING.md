# Contributing to Sistine

Thank you for your interest in contributing to Sistine! This document provides guidelines and instructions for contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm, yarn, npm, or bun
- Git

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/your-username/sistine.git
   cd sistine
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the development server**
   ```bash
   pnpm dev
   ```

4. **Verify everything works**
   - Open http://localhost:3000
   - Check that the site loads correctly
   - Test component examples

## 📝 Development Workflow

Components live in a **single tree** — there is no separate `glass/` folder. Each component owns its semantic variants and draws its surface from the material system in `lib/material.ts`. See `components/ui/button.tsx` for the canonical pattern.

1. **Create the component**
   - Location: `components/ui/[component-name].tsx`
   - Define semantic variants with `cva` — each variant carries *behavior* (text, hover, press), **not** the surface.
   - Give each variant a **surface role** (its default axes) and resolve it with `materialSurface()` from `@/lib/material`. Spread `MaterialAxisProps` (`material`, `border`, `veil`, `gradient`, `glow`, `sheen`) onto the props so callers can override per instance.

2. **Update the registry**
   - Add an entry to `registry.json` pointing at `components/ui/[component-name].tsx`.

3. **Add a component example**
   - Update `lib/component-examples.ts`
   - Add a preview to `components/component-preview.tsx`

4. **Test your component**
   - Verify it works in light and dark mode
   - Test each material (`glass` / `frosted` / `crystal` / `opaque`) plus the adaptive default
   - Check accessibility

### Code Style Guidelines

#### Component Structure

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { type MaterialAxisProps, type MaterialProps, materialSurface } from "@/lib/material"
import { cn } from "@/lib/utils"

// Semantic variants carry BEHAVIOR only (text, hover, press) — the surface comes from the material system.
const componentVariants = cva("…base classes…", {
  variants: {
    variant: {
      glass: "text-foreground hover:opacity-90",
      default: "bg-primary text-primary-foreground",
    },
  },
  defaultVariants: { variant: "glass" },
})

// Each variant's default surface axes (its "role"); null = not a glass surface.
const SURFACE_ROLE: Record<string, MaterialProps | null> = {
  glass: {},     // borderless adaptive glass
  default: null, // plain, no glass surface
}

function Component({
  className,
  variant = "glass",
  material,
  border,
  veil,
  gradient,
  glow,
  sheen,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof componentVariants> & MaterialAxisProps) {
  const m = materialSurface(SURFACE_ROLE[variant ?? "glass"] ?? null, {
    material,
    border,
    veil,
    gradient,
    glow,
    sheen,
  })

  return (
    <div
      data-material={m?.["data-material"]}
      className={cn(m?.className, componentVariants({ variant }), className)}
      {...props}
    />
  )
}
```

#### Naming Conventions

- **Components**: PascalCase (e.g., `Button`, `Card`, `Input`)
- **Props**: camelCase (e.g., `variant`, `material`, `glow`)
- **Files**: kebab-case (e.g., `button.tsx`, `card.tsx`)
- **Types/Interfaces**: PascalCase with `Props` suffix (e.g., `ButtonProps`)

#### TypeScript

- Always use TypeScript
- Export prop types/interfaces
- Use `React.forwardRef` for components that need refs
- Set `displayName` for all components

#### Styling

- Use Tailwind CSS classes
- Draw glass surfaces from the material system (`materialSurface` / `glassMaterial`), never hardcoded recipe class strings
- Support both light and dark themes
- Use `cn()` utility for conditional classes

### Component Requirements

1. **Material Support**
   - Surface glass via `materialSurface()`, defaulting to adaptive glass
   - Accept the material axis props (`material`, `border`, `veil`, `gradient`, `glow`, `sheen`)
   - Support `style={glassVars(...)}` overrides instead of a bespoke customization prop

2. **Accessibility**
   - Use Radix UI primitives when available
   - Proper ARIA attributes
   - Keyboard navigation support
   - Screen reader friendly

3. **Theme Support**
   - Work in both light and dark modes
   - Use theme-aware colors
   - Test theme switching

4. **Responsive Design**
   - Mobile-first approach
   - Responsive breakpoints
   - Touch-friendly interactions

## 🧪 Testing

Before submitting a PR, ensure:

- [ ] Component works in light mode
- [ ] Component works in dark mode
- [ ] All variants are functional
- [ ] No TypeScript errors
- [ ] No linting errors (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Component is accessible
- [ ] Documentation is updated

## 📋 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-commented code
   - Follow the code style guidelines
   - Add/update tests if applicable
   - Update documentation

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `style:` for formatting
   - `refactor:` for code refactoring
   - `test:` for tests
   - `chore:` for maintenance

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Provide a clear description
   - Reference any related issues
   - Include screenshots for UI changes
   - Wait for review and feedback

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass (if applicable)
- [ ] Changes are backward compatible (if possible)

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description** - Clear description of the bug
2. **Steps to Reproduce** - Detailed steps to reproduce
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Screenshots** - If applicable
6. **Environment** - Browser, OS, Node version
7. **Code Example** - Minimal code to reproduce

## 💡 Feature Requests

For feature requests:

1. Check if the feature already exists
2. Open an issue with the `enhancement` label
3. Describe the use case
4. Provide examples if possible
5. Discuss implementation approach

## 📚 Documentation

When adding new components or features:

1. **Update README.md** if needed
2. **Add component examples** in `lib/component-examples.ts`
3. **Update component preview** in `components/component-preview.tsx`
4. **Add JSDoc comments** to components
5. **Update registry.json** with component metadata

## 🎨 Design Guidelines

### Glass Effects

- **Light Mode**: 25% opacity, 30px blur
- **Dark Mode**: 10% opacity, 30px blur
- **Borders**: Subtle white borders with low opacity
- **Shadows**: Multi-layer shadows for depth

### Colors

- Use CSS variables for theme colors
- Support both light and dark themes
- Maintain contrast ratios for accessibility
- Follow Apple's design language

### Animations

- Keep animations subtle and smooth
- Use CSS transitions (200-300ms)
- Avoid excessive motion
- Respect `prefers-reduced-motion`

## 🔍 Code Review

All PRs require review before merging. Reviewers will check:

- Code quality and style
- Functionality and edge cases
- Performance implications
- Accessibility compliance
- Documentation completeness
- Test coverage

## 📞 Getting Help

- **Documentation**: [weekendsuperhero.io](https://weekendsuperhero.io)
- **Issues**: [GitHub Issues](https://github.com/Weekendsuperhero-io/sistine/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Weekendsuperhero-io/sistine/discussions)

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Sistine! 🎉
