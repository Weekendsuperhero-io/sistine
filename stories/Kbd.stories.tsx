import type { Meta, StoryObj } from "@storybook/react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

const meta = {
  title: "Sistine/Kbd",
  component: Kbd,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Kbd>Esc</Kbd>,
};

export const Combination: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <Kbd>⇧</Kbd>
      <Kbd>P</Kbd>
    </KbdGroup>
  ),
};

export const InText: Story = {
  render: () => (
    <p className="text-sm text-foreground">
      Press <Kbd>⌘</Kbd> + <Kbd>K</Kbd> to search, <Kbd>Esc</Kbd> to close.
    </p>
  ),
};
