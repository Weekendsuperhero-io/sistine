import { BellIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";

const meta = {
  title: "Sistine/Item",
  component: Item,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <ItemGroup className="w-[440px]">
      {(
        [
          "default",
          "outline",
          "muted",
        ] as const
      ).map((variant) => (
        <Item key={variant} variant={variant}>
          <ItemMedia variant="icon">
            <BellIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{variant}</ItemTitle>
            <ItemDescription>Mentions, replies and invitations.</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Switch defaultChecked />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  ),
};

export const AsLink: Story = {
  render: () => (
    <ItemGroup className="w-[440px]">
      <Item asChild variant="outline">
        <a href="#security">
          <ItemMedia variant="icon">
            <ShieldCheckIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Security</ItemTitle>
            <ItemDescription>Passkeys, sessions and recovery codes.</ItemDescription>
          </ItemContent>
        </a>
      </Item>
      <ItemSeparator />
      <Item size="sm">
        <ItemContent>
          <ItemTitle>Weekly digest</ItemTitle>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm">
            Manage
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
};
