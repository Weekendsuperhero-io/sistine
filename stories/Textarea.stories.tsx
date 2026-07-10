import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "@/components/ui/textarea";

const meta = {
  title: "Sistine/Textarea",
  component: Textarea,
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
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {
  args: {
    placeholder: "Type your message here...",
  },
};

export const Frosted: Story = {
  args: {
    placeholder: "Frosted textarea...",
    material: "frosted",
    border: true,
  },
};

export const Crystal: Story = {
  args: {
    placeholder: "Crystal textarea...",
    material: "crystal",
    border: true,
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: "This is a pre-filled textarea with some content.\n\nIt spans multiple lines to show how the component handles larger text areas.",
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Disabled textarea",
    disabled: true,
  },
};

export const WithRows: Story = {
  args: {
    placeholder: "Larger textarea with 10 rows",
    rows: 10,
  },
};
