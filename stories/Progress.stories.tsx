import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "@/components/ui/progress";

const meta = {
  title: "Sistine/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 66,
  },
  render: (args) => <Progress {...args} className="w-[320px]" />,
};

export const Steps: Story = {
  render: () => (
    <div className="flex w-[320px] flex-col gap-4">
      {[
        0,
        25,
        50,
        100,
      ].map((v) => (
        <Progress key={v} value={v} />
      ))}
    </div>
  ),
};
