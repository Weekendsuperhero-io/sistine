import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent } from "@/components/ui/glass/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/glass/context-menu";

const meta = {
  title: "Sistine/ContextMenu",
  component: ContextMenu,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card variant="glass" className="p-8 cursor-pointer">
          <CardContent>Right click me</CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent variant="glass">
        <ContextMenuLabel>My Account</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem>Profile</ContextMenuItem>
        <ContextMenuItem>Settings</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Logout</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

export const Frosted: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card variant="glass" className="p-8 cursor-pointer">
          <CardContent>Right click me</CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent variant="frosted">
        <ContextMenuLabel>My Account</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem>Profile</ContextMenuItem>
        <ContextMenuItem>Settings</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Logout</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
