import type { Meta, StoryObj } from '@storybook/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../registry/ui/select';

const meta = {
  title: 'Glass UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[180px]" variant="glass">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent variant="glass">
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="blueberry">Blueberry</SelectItem>
        <SelectItem value="grapes">Grapes</SelectItem>
        <SelectItem value="pineapple">Pineapple</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Frosted: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[180px]" variant="frosted">
        <SelectValue placeholder="Select a theme" />
      </SelectTrigger>
      <SelectContent variant="frosted">
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Crystal: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[200px]" variant="crystal">
        <SelectValue placeholder="Select your timezone" />
      </SelectTrigger>
      <SelectContent variant="crystal">
        <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
        <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
        <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
        <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
        <SelectItem value="akst">Alaska Standard Time (AKST)</SelectItem>
        <SelectItem value="hst">Hawaii Standard Time (HST)</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithDefaultValue: Story = {
  render: () => (
    <Select defaultValue="banana">
      <SelectTrigger className="w-[180px]" variant="glass">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent variant="glass">
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="blueberry">Blueberry</SelectItem>
        <SelectItem value="grapes">Grapes</SelectItem>
      </SelectContent>
    </Select>
  ),
};

