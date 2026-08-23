import { EnvelopeSimpleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";

const meta = {
  title: "Sistine/Input",
  component: Input,
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
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

export const Frosted: Story = {
  args: {
    placeholder: "Frosted input...",
    material: "frosted",
    border: true,
  },
};

export const Crystal: Story = {
  args: {
    placeholder: "Crystal input...",
    material: "crystal",
    border: true,
  },
};

export const WithIcon: Story = {
  args: {
    placeholder: "Search...",
    icon: <MagnifyingGlassIcon className="h-4 w-4" />,
  },
};

export const WithEmailIcon: Story = {
  args: {
    placeholder: "Email address...",
    icon: <EnvelopeSimpleIcon className="h-4 w-4" />,
    type: "email",
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Disabled input",
    disabled: true,
  },
};
