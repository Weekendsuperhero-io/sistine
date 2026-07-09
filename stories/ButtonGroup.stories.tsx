import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

const meta = {
  title: "Sistine/ButtonGroup",
  component: ButtonGroup,
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
    orientation: {
      control: "select",
      options: [
        "horizontal",
        "vertical",
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
    },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: {
    orientation: "horizontal",
    children: (
      <>
        <Button variant="ghost">One</Button>
        <Button variant="ghost">Two</Button>
        <Button variant="ghost">Three</Button>
      </>
    ),
  },
};

export const Vertical: Story = {
  args: {
    orientation: "vertical",
    children: (
      <>
        <Button variant="ghost">One</Button>
        <Button variant="ghost">Two</Button>
        <Button variant="ghost">Three</Button>
      </>
    ),
  },
};

export const Frosted: Story = {
  args: {
    material: "frosted",
    border: true,
    orientation: "horizontal",
    children: (
      <>
        <Button variant="ghost">One</Button>
        <Button variant="ghost">Two</Button>
        <Button variant="ghost">Three</Button>
      </>
    ),
  },
};
