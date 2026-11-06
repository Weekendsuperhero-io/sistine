import type { Meta, StoryObj } from "@storybook/react";
import { MenuBar, MenuBarItem } from "@/components/ui/menu-bar";
import { MATERIALS } from "@/lib/material";

const meta = {
  title: "Sistine/MenuBarLegacy",
  component: MenuBar,
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
        ...MATERIALS,
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
} satisfies Meta<typeof MenuBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <MenuBarItem active>File</MenuBarItem>
        <MenuBarItem>Edit</MenuBarItem>
        <MenuBarItem>View</MenuBarItem>
        <MenuBarItem>Help</MenuBarItem>
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
        <MenuBarItem active>File</MenuBarItem>
        <MenuBarItem>Edit</MenuBarItem>
        <MenuBarItem>View</MenuBarItem>
        <MenuBarItem>Help</MenuBarItem>
      </>
    ),
  },
};
