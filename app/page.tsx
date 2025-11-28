"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/glass/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/glass/card"
import { Badge } from "@/components/ui/glass/badge"
import { Input } from "@/components/ui/glass/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/glass/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/glass/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/glass/textarea"
import { Slider } from "@/components/ui/slider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/glass/sonner"
import { 
  ArrowRight, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  TrendingUp, 
  Users, 
  DollarSign,
  Mail,
  Lock,
  User,
  Search,
  Settings,
  BarChart3,
  Zap,
  Sparkles,
  CreditCard,
  Calendar,
  FileText,
  Globe,
  Moon,
  Sun,
  Volume2,
  Shield,
  Eye,
  EyeOff,
  HelpCircle,
  MessageSquare,
  Send,
  Bot,
  Wallet,
  ShoppingCart,
  TrendingDown
} from "lucide-react"

export default function Home() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [notifications, setNotifications] = React.useState(3)
  const [sliderValue, setSliderValue] = React.useState([50])
  const [showPassword, setShowPassword] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen transition-colors duration-300 relative">
      <Toaster />
      <div className="relative z-10">
        {/* Hero Section with Interactive Components */}
        <section className="container mx-auto px-4 pt-8 pb-16 md:pb-24">
          {/* Hero Text Section */}
          <div className="text-center mb-12">
            <Link 
              href="/docs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-bg border border-[var(--glass-border)] mb-6 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                New Components: Spinner, Button Group, Input Group, Empty State, Menu Bar, Date Picker Input, Context Menu, Carousel
              </span>
            </Link>
            <p className="text-2xl md:text-3xl text-foreground/90 mb-4 max-w-3xl mx-auto font-medium">
              Build beautiful interfaces with glassmorphism components
            </p>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              A modern component library inspired by Apple&apos;s design language. 
              Every component features stunning glass effects by default.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button asChild size="lg" variant="glass" effect="glow">
                <Link href="/docs/getting-started">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/components">
                  Browse Components
                </Link>
              </Button>
            </div>
          </div>

          {/* 3-3-3-3 Grid Layout: Four Component Showcases */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-16">
            {/* Column 1: Settings Panel - Appearance */}
            <div className="lg:col-span-3 space-y-6">
              {/* Appearance Settings */}
              <Card variant="glass" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Appearance Settings</CardTitle>
                  <CardDescription>Customize your interface</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dark Mode</Label>
                      <p className="text-xs text-muted-foreground">Switch to dark theme</p>
                    </div>
                    <Switch variant="glass" defaultChecked={resolvedTheme === "dark"} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Wallpaper Tinting</Label>
                      <p className="text-xs text-muted-foreground">Allow the wallpaper to be tinted</p>
                    </div>
                    <Switch variant="glass" />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Theme Color</Label>
                    <RadioGroup defaultValue="blue" className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="blue" variant="glass" id="blue" />
                        <Label htmlFor="blue" className="cursor-pointer">Blue</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="purple" variant="glass" id="purple" />
                        <Label htmlFor="purple" className="cursor-pointer">Purple</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="green" variant="glass" id="green" />
                        <Label htmlFor="green" className="cursor-pointer">Green</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card variant="frosted" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Security Settings</CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-factor authentication</Label>
                      <p className="text-xs text-muted-foreground">Verify via email or phone number</p>
                    </div>
                    <Switch variant="glass" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Password</Label>
                      <p className="text-xs text-muted-foreground">Display password in plain text</p>
                    </div>
                    <Switch 
                      variant="glass" 
                      checked={showPassword}
                      onCheckedChange={setShowPassword}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Password Strength</Label>
                    <Slider 
                      variant="glass"
                      value={sliderValue}
                      onValueChange={setSliderValue}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">{sliderValue[0]}% secure</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card variant="glass" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>Common actions with glass buttons</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="glass" className="w-full justify-start" effect="glow">
                    <User className="mr-2 h-4 w-4" />
                    View Profile
                  </Button>
                  <Button variant="frosted" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                  <Button variant="crystal" className="w-full justify-start">
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Column 2: AI Chat & Payment Method */}
            <div className="lg:col-span-3 space-y-6">
              {/* AI Chat Showcase */}
              <Card variant="glass" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Chat
                  </CardTitle>
                  <CardDescription>Chat interface with glass components</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8 border border-[var(--glass-border)]">
                        <AvatarFallback className="bg-purple-500/20 text-purple-600 dark:text-purple-400">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] rounded-lg p-3">
                        <p className="text-sm">Hello! How can I help you today?</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 justify-end">
                      <div className="flex-1 glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] rounded-lg p-3 max-w-[80%]">
                        <p className="text-sm">I need help with Glass UI components</p>
                      </div>
                      <Avatar className="h-8 w-8 border border-[var(--glass-border)]">
                        <AvatarImage src="https://github.com/akshaypjoshi.png" />
                        <AvatarFallback>AJ</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full">
                    <Input 
                      variant="glass" 
                      placeholder="Type a message..."
                      className="flex-1 min-w-0"
                    />
                    <Button variant="glass" size="icon" effect="glow" className="shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Showcase */}
              <Card variant="frosted" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                  <CardDescription>Saved payment cards</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Card variant="glass" className="border-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <CreditCard className="h-6 w-6 text-foreground/60" />
                        <Badge variant="glass">Primary</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-mono tracking-wider">•••• •••• •••• 4242</p>
                        <p className="text-xs text-muted-foreground">Expires 12/25</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Button variant="outline" className="w-full" size="sm">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Add New Card
                  </Button>
                </CardContent>
              </Card>

              {/* Status & Badges Showcase */}
              <Card variant="crystal" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Status & Badges</CardTitle>
                  <CardDescription>Visual indicators and labels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="glass">New</Badge>
                    <Badge variant="frosted">Featured</Badge>
                    <Badge variant="crystal">Premium</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="glass" className="bg-green-500/20 text-green-600 dark:text-green-400">
                        Online
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Version</span>
                      <Badge variant="glass">v1.0.0</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">License</span>
                      <Badge variant="frosted">MIT</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 3: User Card & Notifications */}
            <div className="lg:col-span-3 space-y-6">
              {/* User Card Showcase */}
              <Card variant="glass" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">User Card</CardTitle>
                  <CardDescription>Profile information display</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-[var(--glass-border)]">
                      <AvatarImage src="https://github.com/akshaypjoshi.png" />
                      <AvatarFallback>AJ</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-sm">Akshay Joshi</div>
                      <div className="text-xs text-muted-foreground">Developer</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="glass" className="bg-green-500/20 text-green-600 dark:text-green-400">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Role</span>
                      <span className="font-medium text-sm">Admin</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    View Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Notifications Showcase */}
              <Card variant="frosted" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  <CardDescription>Alert messages and status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Alert variant="glass" className="py-3">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle className="text-sm">Success</AlertTitle>
                    <AlertDescription className="text-xs">
                      Your changes have been saved.
                    </AlertDescription>
                  </Alert>
                  <Alert variant="frosted" className="py-3">
                    <Info className="h-4 w-4" />
                    <AlertTitle className="text-sm">Info</AlertTitle>
                    <AlertDescription className="text-xs">
                      New features available in settings.
                    </AlertDescription>
                  </Alert>
                  <Alert variant="crystal" className="py-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-sm">Warning</AlertTitle>
                    <AlertDescription className="text-xs">
                      Please review your account settings.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Get Started CTA */}
              <Card variant="glass" className="border-2 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10">
                <CardHeader>
                  <CardTitle className="text-lg">Get Started</CardTitle>
                  <CardDescription>Start building today</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild variant="glass" className="w-full" effect="glow">
                    <Link href="/docs/getting-started">
                      Documentation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/components">
                      Components
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Column 4: Sign In & FAQ */}
            <div className="lg:col-span-3 space-y-6">
              {/* Sign In Showcase */}
              <Card variant="glass" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Sign In</CardTitle>
                  <CardDescription>Experience glass form inputs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Input 
                      variant="glass" 
                      placeholder="Email address" 
                      icon={<Mail className="h-4 w-4 text-foreground/60" />}
                    />
                    <Input 
                      variant="frosted" 
                      type="password" 
                      placeholder="Password" 
                      icon={<Lock className="h-4 w-4 text-foreground/60" />}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-muted-foreground flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      Remember me
                    </label>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Forgot password?
                    </Button>
                  </div>
                  <Button variant="glass" className="w-full" effect="glow">
                    Sign In
                  </Button>
                </CardContent>
              </Card>

              {/* FAQ Section */}
              <Card variant="glass" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">FAQ Section</CardTitle>
                  <CardDescription>Collapsible content with accordion</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-none">
                      <AccordionTrigger className="text-sm py-2">
                        How do I get started?
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        Check out our documentation to learn how to install and use Glass UI components.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2" className="border-none">
                      <AccordionTrigger className="text-sm py-2">
                        Is it free to use?
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        Yes, Glass UI is open source and free to use in your projects.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3" className="border-none">
                      <AccordionTrigger className="text-sm py-2">
                        Can I customize the components?
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        Absolutely! All components are fully customizable with CSS variables and props.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Interactive Help */}
              <Card variant="crystal" className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Interactive Help</CardTitle>
                  <CardDescription>Hover for tooltips</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Need help?</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent variant="glass">
                          <p>Click here to access our help center</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Notifications</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="glass" className="cursor-help">
                            {notifications} New
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent variant="glass">
                          <p>You have {notifications} unread notifications</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Settings</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent variant="glass">
                          <p>Open settings panel</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Dashboard Preview - Full Width Below */}
          <div className="mb-16">
            <Card variant="frosted" className="overflow-hidden border-2">
              <CardHeader className="border-b border-[var(--glass-border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">Dashboard Preview</CardTitle>
                    <CardDescription>See Glass UI components in action</CardDescription>
                  </div>
                  <Badge variant="glass" className="flex items-center gap-2">
                    <Bell className="h-3 w-3" />
                    {notifications} New
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card variant="glass" className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">$45,231</div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        +20.1% from last month
                      </p>
                    </CardContent>
                  </Card>
                  <Card variant="frosted" className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">2,350</div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        +180.1% from last month
                      </p>
                    </CardContent>
                  </Card>
                  <Card variant="crystal" className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Conversion</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">12.5%</div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        +19% from last month
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart Showcase */}
                <div className="mb-6">
                  <Card variant="glass" className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Revenue Overview</CardTitle>
                      <CardDescription>Monthly revenue and user growth</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          revenue: {
                            label: "Revenue",
                            color: "hsl(var(--chart-1))",
                          },
                          users: {
                            label: "Users",
                            color: "hsl(var(--chart-2))",
                          },
                        }}
                        variant="glass"
                        className="h-[300px] w-full"
                      >
                        <BarChart
                          data={[
                            { month: "Jan", revenue: 186, users: 80 },
                            { month: "Feb", revenue: 305, users: 200 },
                            { month: "Mar", revenue: 237, users: 120 },
                            { month: "Apr", revenue: 273, users: 190 },
                            { month: "May", revenue: 209, users: 130 },
                            { month: "Jun", revenue: 214, users: 140 },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                          />
                          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                          <Bar dataKey="users" fill="var(--color-users)" radius={4} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* User Profile & Recent Activity - 6-6 Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* User Profile */}
                  <Card variant="glass" className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">User Profile</CardTitle>
                      <CardDescription>Glass cards with user data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-[var(--glass-border)]">
                          <AvatarImage src="https://github.com/akshaypjoshi.png" />
                          <AvatarFallback>AJ</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">Akshay Joshi</div>
                          <div className="text-sm text-muted-foreground">Developer</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant="glass">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Role</span>
                          <span className="font-medium">Admin</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Joined</span>
                          <span className="font-medium">Jan 2024</span>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        Edit Profile
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card variant="frosted" className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                      <CardDescription>Latest updates and actions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Task completed</p>
                            <p className="text-xs text-muted-foreground">2 minutes ago</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">New team member joined</p>
                            <p className="text-xs text-muted-foreground">1 hour ago</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
                            <BarChart3 className="h-4 w-4 text-purple-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Report generated</p>
                            <p className="text-xs text-muted-foreground">3 hours ago</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full glass-bg backdrop-blur-[var(--blur-sm)] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
                            <Bell className="h-4 w-4 text-yellow-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Notification sent</p>
                            <p className="text-xs text-muted-foreground">5 hours ago</p>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full" size="sm">
                        View All Activity
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Alerts Showcase */}
                <div className="space-y-3 mb-6">
                  <Alert variant="glass">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                      Your changes have been saved successfully.
                    </AlertDescription>
                  </Alert>
                  <Alert variant="frosted">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Information</AlertTitle>
                    <AlertDescription>
                      Glass UI components are fully customizable and accessible.
                    </AlertDescription>
                  </Alert>
                  <Alert variant="crystal">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Make sure to test components in both light and dark modes.
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Tabs Showcase */}
                <Card variant="glass" className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Component Variants</CardTitle>
                    <CardDescription>Explore different glass effects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="glass">
                      <TabsList variant="glass" className="mb-4">
                        <TabsTrigger value="glass">Glass</TabsTrigger>
                        <TabsTrigger value="frosted">Frosted</TabsTrigger>
                        <TabsTrigger value="fluted">Fluted</TabsTrigger>
                        <TabsTrigger value="crystal">Crystal</TabsTrigger>
                      </TabsList>
                      <TabsContent value="glass" className="space-y-4">
                        <div className="p-4 glass-bg backdrop-blur-[var(--blur)] border border-[var(--glass-border)] rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Standard glass effect with subtle blur and transparency.
                          </p>
                        </div>
                      </TabsContent>
                      <TabsContent value="frosted" className="space-y-4">
                        <div className="p-4 glass-frosted backdrop-blur-[var(--blur-frosted)] border border-[var(--glass-frosted-border)] rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Enhanced frosted glass with stronger blur and opacity.
                          </p>
                        </div>
                      </TabsContent>
                      <TabsContent value="fluted" className="space-y-4">
                        <div className="p-4 glass-fluted backdrop-blur-[var(--blur)] border border-[var(--glass-border)] rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Textured fluted glass with vertical ridges pattern.
                          </p>
                        </div>
                      </TabsContent>
                      <TabsContent value="crystal" className="space-y-4">
                        <div className="p-4 glass-crystal backdrop-blur-[var(--blur-crystal)] border border-[var(--glass-crystal-border)] rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Premium crystal effect with layered highlights and minimal blur.
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Actions Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Try It Yourself
              </h2>
              <p className="text-lg text-muted-foreground">
                Click the buttons below to see Glass UI components in action
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="glass" className="w-full py-6 px-4" effect="glow">
                    <div className="text-center w-full">
                      <div className="font-semibold">Open Dialog</div>
                      <div className="text-xs text-muted-foreground mt-1">See glass modal</div>
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent variant="frosted" className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Glass Dialog</DialogTitle>
                    <DialogDescription>
                      This is a beautiful glass dialog component. Notice the backdrop blur and transparency effects.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input variant="glass" placeholder="Enter your name" />
                    <Select>
                      <SelectTrigger variant="glass">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent variant="glass">
                        <SelectItem value="option1">Option 1</SelectItem>
                        <SelectItem value="option2">Option 2</SelectItem>
                        <SelectItem value="option3">Option 3</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline">Cancel</Button>
                      <Button variant="glass" effect="glow">Confirm</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                variant="frosted" 
                className="w-full py-6 px-4"
                onClick={() => {
                  toast.success('Success!', {
                    description: 'This is a glass toast notification',
                  })
                }}
              >
                <div className="text-center w-full">
                  <div className="font-semibold">Show Toast</div>
                  <div className="text-xs text-muted-foreground mt-1">Glass notifications</div>
                </div>
              </Button>

              <Button 
                variant="crystal" 
                className="w-full py-6 px-4"
                onClick={() => {
                  toast('Info', {
                    description: 'Glass UI components are beautiful and functional',
                    action: {
                      label: 'Learn More',
                      onClick: () => window.open('/docs/getting-started', '_blank'),
                    },
                  })
                }}
              >
                <div className="text-center w-full">
                  <div className="font-semibold">Toast with Action</div>
                  <div className="text-xs text-muted-foreground mt-1">Interactive toasts</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Glass UI?
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to build modern, beautiful interfaces
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card variant="glass" className="border-2 text-center">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl glass-bg backdrop-blur-[var(--blur)] border border-[var(--glass-border)] flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">40+ Components</CardTitle>
                  <CardDescription>
                    Comprehensive collection of glass UI components ready to use
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card variant="frosted" className="border-2 text-center">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl glass-bg backdrop-blur-[var(--blur)] border border-[var(--glass-border)] flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-6 w-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">4 Variants</CardTitle>
                  <CardDescription>
                    Glass, Frosted, Fluted, and Crystal variants for every component
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card variant="fluted" className="border-2 text-center">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl glass-bg backdrop-blur-[var(--blur)] border border-[var(--glass-border)] flex items-center justify-center mx-auto mb-4">
                    <Settings className="h-6 w-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">Fully Customizable</CardTitle>
                  <CardDescription>
                    Customize colors, blur, transparency, and more per component
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card variant="crystal" className="border-2 text-center">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl glass-bg backdrop-blur-[var(--blur)] border border-[var(--glass-border)] flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-6 w-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">Accessible</CardTitle>
                  <CardDescription>
                    Built on Radix UI primitives for full accessibility support
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-3xl mx-auto text-center">
            <Card variant="glass" className="border-2 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-3xl md:text-4xl mb-4">Ready to get started?</CardTitle>
                <CardDescription className="text-lg">
                  Start building beautiful interfaces with Glass UI today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Button asChild variant="glass" size="lg" effect="glow">
                    <Link href="/docs/getting-started">
                      View Documentation
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/components">
                      Browse Components
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
