import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const meta = {
  title: 'Glass UI/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="flex items-center space-x-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'checkbox-default',
  },
  render: (args) => (
    <>
      <Checkbox {...args} />
      <Label htmlFor="checkbox-default">Accept terms and conditions</Label>
    </>
  ),
};

export const Checked: Story = {
  args: {
    id: 'checkbox-checked',
    defaultChecked: true,
  },
  render: (args) => (
    <>
      <Checkbox {...args} />
      <Label htmlFor="checkbox-checked">I agree to the terms</Label>
    </>
  ),
};

export const Disabled: Story = {
  args: {
    id: 'checkbox-disabled',
    disabled: true,
  },
  render: (args) => (
    <>
      <Checkbox {...args} />
      <Label htmlFor="checkbox-disabled">Disabled checkbox</Label>
    </>
  ),
};

export const DisabledChecked: Story = {
  args: {
    id: 'checkbox-disabled-checked',
    disabled: true,
    defaultChecked: true,
  },
  render: (args) => (
    <>
      <Checkbox {...args} />
      <Label htmlFor="checkbox-disabled-checked">Disabled & checked</Label>
    </>
  ),
};

