import { FolderOpenIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

const meta = {
  title: "Sistine/Empty",
  component: Empty,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

/* Plain by default: the usual home of an empty state is a surface that is already glass. */
export const InsideACard: Story = {
  render: () => (
    <Card className="w-[420px]">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpenIcon />
          </EmptyMedia>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>Create your first project to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Create project</Button>
        </EmptyContent>
      </Empty>
    </Card>
  ),
};

export const OnItsOwnSurface: Story = {
  render: () => (
    <Empty variant="glass" border className="w-[420px]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MagnifyingGlassIcon />
        </EmptyMedia>
        <EmptyTitle>No results</EmptyTitle>
        <EmptyDescription>Nothing matches “glass”. Try a different search.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};
