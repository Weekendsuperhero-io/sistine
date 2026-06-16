import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const meta = {
  title: "Sistine/Slider",
  component: Slider,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[300px]">
      <Slider
        defaultValue={[
          50,
        ]}
        max={100}
        step={1}
      />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div className="space-y-2">
        <Label>Volume</Label>
        <Slider
          defaultValue={[
            33,
          ]}
          max={100}
          step={1}
        />
      </div>
    </div>
  ),
};

export const Range: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div className="space-y-2">
        <Label>Price Range</Label>
        <Slider
          defaultValue={[
            25,
            75,
          ]}
          max={100}
          step={1}
        />
      </div>
    </div>
  ),
};

export const Steps: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div className="space-y-2">
        <Label>Rating (0-5)</Label>
        <Slider
          defaultValue={[
            3,
          ]}
          max={5}
          step={1}
        />
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div className="space-y-2">
        <Label>Disabled Slider</Label>
        <Slider
          defaultValue={[
            50,
          ]}
          max={100}
          step={1}
          disabled
        />
      </div>
    </div>
  ),
};

export const MultipleSliders: Story = {
  render: () => (
    <div className="w-[300px] space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Brightness</Label>
          <span className="text-sm text-muted-foreground">70%</span>
        </div>
        <Slider
          defaultValue={[
            70,
          ]}
          max={100}
          step={1}
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Contrast</Label>
          <span className="text-sm text-muted-foreground">50%</span>
        </div>
        <Slider
          defaultValue={[
            50,
          ]}
          max={100}
          step={1}
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Saturation</Label>
          <span className="text-sm text-muted-foreground">80%</span>
        </div>
        <Slider
          defaultValue={[
            80,
          ]}
          max={100}
          step={1}
        />
      </div>
    </div>
  ),
};
