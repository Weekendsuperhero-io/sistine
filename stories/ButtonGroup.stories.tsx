import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/glass/button";
import { ButtonGroup } from "@/components/ui/glass/button-group";

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
        "glass",
        "glassSubtle",
        "frosted",
        "fluted",
        "crystal",
      ],
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
    variant: "glass",
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
    variant: "glass",
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
    variant: "frosted",
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
