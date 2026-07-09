import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Sistine/Button",
  component: Button,
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
        "destructive",
        "outline",
        "secondary",
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
    size: {
      control: "select",
      options: [
        "default",
        "sm",
        "lg",
        "icon",
      ],
    },
    effect: {
      control: "select",
      options: [
        "none",
        "glow",
        "shimmer",
        "ripple",
        "lift",
        "scale",
      ],
      description: "Hover animation effect",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {
  args: {
    children: "Glass Button",
    effect: "glow",
  },
};

export const Frosted: Story = {
  args: {
    children: "Frosted Button",
    material: "frosted",
    border: true,
    effect: "glow",
  },
};

export const Crystal: Story = {
  args: {
    children: "Crystal Button",
    material: "crystal",
    border: true,
    effect: "glow",
  },
};

export const WithShimmer: Story = {
  args: {
    children: "Shimmer Effect",
    effect: "shimmer",
  },
};

export const WithRipple: Story = {
  args: {
    children: "Ripple Effect",
    effect: "ripple",
  },
};

export const Small: Story = {
  args: {
    children: "Small Button",
    size: "sm",
    effect: "glow",
  },
};

export const Large: Story = {
  args: {
    children: "Large Button",
    size: "lg",
    effect: "glow",
  },
};
