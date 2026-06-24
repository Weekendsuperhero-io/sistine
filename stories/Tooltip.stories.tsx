import type { Meta, StoryObj } from "@storybook/react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/glass/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const meta = {
  title: "Sistine/Tooltip",
  component: Tooltip,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="glass">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This is a tooltip</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="glass" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Add new item</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const RichContent: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="glass">More info</Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-semibold">Advanced Feature</p>
        <p className="text-sm text-muted-foreground mt-1">This feature provides advanced functionality for power users.</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const Positions: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="glass" size="sm">
            Top
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Tooltip on top</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="glass" size="sm">
            Right
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Tooltip on right</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="glass" size="sm">
            Bottom
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Tooltip on bottom</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="glass" size="sm">
            Left
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Tooltip on left</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

export const Keyboard: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="glass">Save</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Save changes</p>
        <p className="text-xs text-muted-foreground mt-1">⌘S</p>
      </TooltipContent>
    </Tooltip>
  ),
};
