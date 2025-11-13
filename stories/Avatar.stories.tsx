import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarFallback, AvatarImage } from '../registry/ui/avatar';

const meta = {
  title: 'Glass UI/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/akshaypjoshi.png" alt="@akshaypjoshi" />
      <AvatarFallback>AP</AvatarFallback>
    </Avatar>
  ),
};

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="/invalid-url.jpg" alt="@username" />
      <AvatarFallback>AJ</AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar className="h-8 w-8">
        <AvatarImage src="https://github.com/akshaypjoshi.png" />
        <AvatarFallback>SM</AvatarFallback>
      </Avatar>
      <Avatar className="h-10 w-10">
        <AvatarImage src="https://github.com/akshaypjoshi.png" />
        <AvatarFallback>MD</AvatarFallback>
      </Avatar>
      <Avatar className="h-16 w-16">
        <AvatarImage src="https://github.com/akshaypjoshi.png" />
        <AvatarFallback>LG</AvatarFallback>
      </Avatar>
      <Avatar className="h-20 w-20">
        <AvatarImage src="https://github.com/akshaypjoshi.png" />
        <AvatarFallback>XL</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <div className="flex -space-x-4">
      <Avatar className="border-2 border-background">
        <AvatarImage src="https://github.com/akshaypjoshi.png" />
        <AvatarFallback>U1</AvatarFallback>
      </Avatar>
      <Avatar className="border-2 border-background">
        <AvatarImage src="https://github.com/akshaypjoshi.png" />
        <AvatarFallback>U2</AvatarFallback>
      </Avatar>
      <Avatar className="border-2 border-background">
        <AvatarImage src="https://github.com/akshaypjoshi.png" />
        <AvatarFallback>U3</AvatarFallback>
      </Avatar>
      <Avatar className="border-2 border-background">
        <AvatarFallback>+5</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const CustomFallback: Story = {
  render: () => (
    <div className="flex gap-4">
      <Avatar>
        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500">
          AB
        </AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500">
          CD
        </AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500">
          EF
        </AvatarFallback>
      </Avatar>
    </div>
  ),
};

