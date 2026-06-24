import type { Meta, StoryObj } from "@storybook/react";
import { EnvelopeSimpleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/glass/input";

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
        "glass",
        "frosted",
        "fluted",
        "crystal",
      ],
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {
  args: {
    placeholder: "Enter text...",
    variant: "glass",
  },
};

export const Frosted: Story = {
  args: {
    placeholder: "Frosted input...",
    variant: "frosted",
  },
};

export const Crystal: Story = {
  args: {
    placeholder: "Crystal input...",
    variant: "crystal",
  },
};

export const WithIcon: Story = {
  args: {
    placeholder: "Search...",
    variant: "glass",
    icon: <MagnifyingGlassIcon className="h-4 w-4" />,
  },
};

export const WithEmailIcon: Story = {
  args: {
    placeholder: "Email address...",
    variant: "glass",
    icon: <EnvelopeSimpleIcon className="h-4 w-4" />,
    type: "email",
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Disabled input",
    variant: "glass",
    disabled: true,
  },
};
