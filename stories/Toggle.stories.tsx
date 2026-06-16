import type { Meta, StoryObj } from "@storybook/react";
import { Bold, Italic, Underline } from "@phosphor-icons/react";
import { Toggle } from "@/components/ui/toggle";

const meta = {
  title: "Sistine/Toggle",
  component: Toggle,
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
        "outline",
      ],
    },
    size: {
      control: "select",
      options: [
        "default",
        "sm",
        "lg",
      ],
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Bold className="h-4 w-4" />
      </>
    ),
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: (
      <>
        <Italic className="h-4 w-4" />
      </>
    ),
  },
};

export const WithText: Story = {
  args: {
    children: (
      <>
        <Bold className="mr-2 h-4 w-4" />
        Bold
      </>
    ),
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    children: (
      <>
        <Italic className="h-4 w-4" />
      </>
    ),
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: (
      <>
        <Underline className="h-4 w-4" />
      </>
    ),
  },
};

export const Group: Story = {
  render: () => (
    <div className="flex gap-1">
      <Toggle aria-label="Toggle bold">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Toggle italic">
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle aria-label="Toggle underline">
        <Underline className="h-4 w-4" />
      </Toggle>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <Bold className="h-4 w-4" />
      </>
    ),
  },
};
