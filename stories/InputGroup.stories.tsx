import type { Meta, StoryObj } from "@storybook/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/glass/button";
import { Input } from "@/components/ui/glass/input";
import { InputGroup } from "@/components/ui/glass/input-group";

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
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithButton: Story = {
  args: {
    variant: "glass",
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
    variant: "frosted",
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
