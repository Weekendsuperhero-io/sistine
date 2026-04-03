import type { Meta, StoryObj } from "@storybook/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const meta = {
  title: "Glass UI/Accordion",
  component: Accordion,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[450px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern and uses Radix UI primitives.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>Yes. It comes with beautiful glass morphism styling that you can customize.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is it animated?</AccordionTrigger>
        <AccordionContent>Yes. It's animated by default with smooth transitions and effects.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" className="w-[450px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>What is Glass UI?</AccordionTrigger>
        <AccordionContent>Glass UI is a modern, glassmorphic component library built with Next.js, React, and shadcn-ui registry.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>What variants are available?</AccordionTrigger>
        <AccordionContent>
          We offer multiple glass variants including glass, frosted, fluted, and crystal, each with unique visual effects.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Can I customize the components?</AccordionTrigger>
        <AccordionContent>
          Absolutely! Components support custom glass properties including color, blur, transparency, outline, and glow effects.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-4">
        <AccordionTrigger>Is it production ready?</AccordionTrigger>
        <AccordionContent>Yes! All components are fully tested, accessible, and optimized for production use.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const FAQ: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[500px]">
      <AccordionItem value="getting-started">
        <AccordionTrigger>How do I get started?</AccordionTrigger>
        <AccordionContent>
          Install components using the shadcn CLI: <code className="text-sm">pnpm dlx shadcn@latest add @glass-ui/component-name</code>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="customization">
        <AccordionTrigger>How can I customize glass effects?</AccordionTrigger>
        <AccordionContent>
          Pass a <code className="text-sm">glass</code> prop with custom properties like color, blur, transparency, outline, and innerGlow.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="theming">
        <AccordionTrigger>Does it support dark mode?</AccordionTrigger>
        <AccordionContent>Yes! All components automatically adapt to light and dark modes using next-themes.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="typescript">
        <AccordionTrigger>Is TypeScript supported?</AccordionTrigger>
        <AccordionContent>Yes! All components are fully typed with TypeScript for the best developer experience.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
