import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '@/components/ui/textarea';

const meta = {
  title: 'Glass UI/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'glass', 'glassSubtle', 'frosted', 'fluted', 'crystal'],
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {
  args: {
    placeholder: 'Type your message here...',
    variant: 'glass',
  },
};

export const Frosted: Story = {
  args: {
    placeholder: 'Frosted textarea...',
    variant: 'frosted',
  },
};

export const Crystal: Story = {
  args: {
    placeholder: 'Crystal textarea...',
    variant: 'crystal',
  },
};

export const WithValue: Story = {
  args: {
    variant: 'glass',
    defaultValue: 'This is a pre-filled textarea with some content.\n\nIt spans multiple lines to show how the component handles larger text areas.',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    variant: 'glass',
    disabled: true,
  },
};

export const WithRows: Story = {
  args: {
    placeholder: 'Larger textarea with 10 rows',
    variant: 'glass',
    rows: 10,
  },
};

