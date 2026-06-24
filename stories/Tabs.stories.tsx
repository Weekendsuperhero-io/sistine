import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/glass/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/glass/tabs";

const meta = {
  title: "Sistine/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Glass: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList variant="glass">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Make changes to your account here. Click save when you're done.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">Your account settings and preferences.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="password">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password here. After saving, you'll be logged out.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">Update your password securely.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const Frosted: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[400px]">
      <TabsList variant="frosted">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Card variant="frosted">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Dashboard overview content with frosted glass effect.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="analytics">
        <Card variant="frosted">
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Analytics data and insights.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="reports">
        <Card variant="frosted">
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Generated reports and documents.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const Crystal: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList variant="crystal">
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <Card variant="crystal">
          <CardHeader>
            <CardTitle>Crystal Tab 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Premium crystal glass effect with layered styling.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="tab2">
        <Card variant="crystal">
          <CardHeader>
            <CardTitle>Crystal Tab 2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Second tab with crystal glass effect.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="tab3">
        <Card variant="crystal">
          <CardHeader>
            <CardTitle>Crystal Tab 3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Third tab with crystal glass effect.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const WithGlow: Story = {
  render: () => (
    <Tabs defaultValue="home" className="w-[400px]">
      <TabsList variant="glass" glow>
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="home">
        <Card variant="glass">
          <CardContent className="pt-6">
            <p className="text-sm">Home content with glowing tab list.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="profile">
        <Card variant="glass">
          <CardContent className="pt-6">
            <p className="text-sm">Profile information and settings.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="settings">
        <Card variant="glass">
          <CardContent className="pt-6">
            <p className="text-sm">Application settings and preferences.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};
