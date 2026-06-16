import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { DatePickerInput } from "@/components/ui/glass/date-picker-input";

const meta = {
  title: "Sistine/DatePickerInput",
  component: DatePickerInput,
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
} satisfies Meta<typeof DatePickerInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [date, setDate] = React.useState<Date | undefined>(undefined);
    return <DatePickerInput {...args} value={date} onChange={setDate} />;
  },
  args: {
    variant: "glass",
    placeholder: "Pick a date",
  },
};

export const Frosted: Story = {
  render: (args) => {
    const [date, setDate] = React.useState<Date | undefined>(undefined);
    return <DatePickerInput {...args} value={date} onChange={setDate} />;
  },
  args: {
    variant: "frosted",
    placeholder: "Pick a date",
  },
};
