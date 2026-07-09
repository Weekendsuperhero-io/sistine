import type { Meta, StoryObj } from "@storybook/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup } from "@/components/ui/input-group";

const meta = {
  title: "Sistine/InputGroup",
  component: InputGroup,
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
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithButton: Story = {
  args: {
    children: (
      <>
        <Input placeholder="Search..." className="border-0 rounded-r-none" />
        <Button variant="ghost" size="icon" className="rounded-l-none">
          <MagnifyingGlassIcon className="h-4 w-4" />
        </Button>
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
        <Input placeholder="Search..." className="border-0 rounded-r-none" />
        <Button variant="ghost" size="icon" className="rounded-l-none">
          <MagnifyingGlassIcon className="h-4 w-4" />
        </Button>
      </>
    ),
  },
};
