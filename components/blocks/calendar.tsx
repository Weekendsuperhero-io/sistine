"use client";

import { Clock, MapPin } from "@phosphor-icons/react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const initialEvents = [
  {
    id: 1,
    title: "Team Meeting",
    time: "10:00 AM",
    location: "Conference Room A",
    date: new Date(),
  },
  {
    id: 2,
    title: "Client Call",
    time: "2:00 PM",
    location: "Zoom",
    date: new Date(),
  },
  {
    id: 3,
    title: "Project Review",
    time: "4:00 PM",
    location: "Office",
    date: new Date(),
  },
];

export function CalendarBlock() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [events, setEvents] = React.useState(initialEvents);
  const nextId = React.useRef(initialEvents.length + 1);

  const isSameDay = (a?: Date, b?: Date) => !!a && !!b && a.toDateString() === b.toDateString();
  const dayEvents = events.filter((event) => isSameDay(event.date, selectedDate));
  const dateLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "Select a date";

  const addEvent = () => {
    if (!selectedDate) return;
    const id = nextId.current++;
    setEvents((prev) => [
      ...prev,
      {
        id,
        title: `New Event ${id}`,
        time: "12:00 PM",
        location: "TBD",
        date: selectedDate,
      },
    ]);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Calendar</h2>
          <p className="text-muted-foreground">Manage your schedule and events</p>
        </div>
        <Button variant="glass" className="text-foreground" onClick={addEvent} disabled={!selectedDate}>
          New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="glass" className="lg:col-span-2 text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Calendar View</CardTitle>
            <CardDescription className="text-muted-foreground">Select a date to view events</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} variant="glass" className="rounded-md border" />
          </CardContent>
        </Card>

        <Card variant="glass" className="text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Upcoming Events</CardTitle>
            <CardDescription className="text-muted-foreground">{dateLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {dayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events for this date — use New Event to add one.</p>
                ) : (
                  dayEvents.map((event) => (
                    <div key={event.id} className="p-4 rounded-lg glass-surface">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{event.title}</h4>
                        <Badge variant="glass">{isSameDay(event.date, new Date()) ? "Today" : "Scheduled"}</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
