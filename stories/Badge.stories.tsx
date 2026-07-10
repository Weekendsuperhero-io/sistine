import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/badge";

const meta = {
  title: "Sistine/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "outline",
        "ghost",
        "link",
      ],
    },
    material: {
      control: "select",
      options: [
        "glass",
        "frosted",
        "crystal",
        "opaque",
      ],
    },
    border: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {
  args: {
    children: "Glass Badge",
  },
};

export const Frosted: Story = {
  args: {
    children: "Frosted",
    material: "frosted",
    border: true,
  },
};

export const Crystal: Story = {
  args: {
    children: "Crystal",
    material: "crystal",
    border: true,
  },
};

export const WithGlow: Story = {
  args: {
    children: "Glowing Badge",
    // The base Badge has no glow prop — glow is an axis class in the material system.
    className: "glass-glow",
  },
};
