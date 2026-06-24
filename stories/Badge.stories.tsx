import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/glass/badge";

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
        "glass",
        "frosted",
        "fluted",
        "crystal",
        "secondary",
        "destructive",
        "outline",
      ],
    },
    glow: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {
  args: {
    children: "Glass Badge",
    variant: "glass",
  },
};

export const Frosted: Story = {
  args: {
    children: "Frosted",
    variant: "frosted",
  },
};

export const Crystal: Story = {
  args: {
    children: "Crystal",
    variant: "crystal",
  },
};

export const WithGlow: Story = {
  args: {
    children: "Glowing Badge",
    variant: "glass",
    glow: true,
  },
};
