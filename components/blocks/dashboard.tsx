"use client";

import { PulseIcon as Activity, CreditCard, CurrencyDollarSimpleIcon, Users } from "@phosphor-icons/react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DashboardBlock() {
  return (
    <div className="space-y-6 p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass" className="text-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Revenue</CardTitle>
            <CurrencyDollarSimpleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">$45,231.89</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-400">+20.1%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card variant="glass" className="text-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">+2350</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-400">+180.1%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card variant="glass" className="text-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">+12,234</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-400">+19%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card variant="glass" className="text-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">+573</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-400">+201</span> since last hour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass" className="text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
            <CardDescription className="text-muted-foreground">Latest transactions and events</CardDescription>
          </CardHeader>
          <CardContent>
            <Table variant="glass">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">User</TableHead>
                  <TableHead className="text-foreground">Action</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-foreground">John Doe</TableCell>
                  <TableCell className="text-foreground">Purchase</TableCell>
                  <TableCell>
                    <Badge variant="glass">Completed</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-foreground">Jane Smith</TableCell>
                  <TableCell className="text-foreground">Subscription</TableCell>
                  <TableCell>
                    <Badge variant="glass">Active</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card variant="glass" className="text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Overview</CardTitle>
            <CardDescription className="text-muted-foreground">Performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "var(--chart-1)",
                },
                users: {
                  label: "Users",
                  color: "var(--chart-2)",
                },
              }}
              variant="glass"
              className="h-[300px]"
            >
              <BarChart
                data={[
                  {
                    month: "Jan",
                    revenue: 186,
                    users: 80,
                  },
                  {
                    month: "Feb",
                    revenue: 305,
                    users: 200,
                  },
                  {
                    month: "Mar",
                    revenue: 237,
                    users: 120,
                  },
                  {
                    month: "Apr",
                    revenue: 273,
                    users: 190,
                  },
                  {
                    month: "May",
                    revenue: 209,
                    users: 130,
                  },
                  {
                    month: "Jun",
                    revenue: 214,
                    users: 140,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                <Bar dataKey="users" fill="var(--color-users)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
