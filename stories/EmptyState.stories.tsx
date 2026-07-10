import type { Meta, StoryObj } from "@storybook/react";
import { Inbox } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyStateDescription, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state";

const meta = {
  title: "Sistine/EmptyState",
  component: EmptyState,
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
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <EmptyStateIcon>
          <Inbox className="h-12 w-12" />
        </EmptyStateIcon>
        <EmptyStateTitle>No items found</EmptyStateTitle>
        <EmptyStateDescription>Get started by creating a new item.</EmptyStateDescription>
        <Button className="mt-4">Create Item</Button>
      </>
    ),
  },
};

export const Frosted: Story = {
  args: {
    material: "frosted",
    border: true,
    children: (
      <>
        <EmptyStateIcon>
          <Inbox className="h-12 w-12" />
        </EmptyStateIcon>
        <EmptyStateTitle>No items found</EmptyStateTitle>
        <EmptyStateDescription>Get started by creating a new item.</EmptyStateDescription>
        <Button className="mt-4">Create Item</Button>
      </>
    ),
  },
};
