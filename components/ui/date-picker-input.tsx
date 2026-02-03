"use client";

import { Button } from "@os-glass/components/ui/button";
import { Calendar } from "@os-glass/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@os-glass/components/ui/popover";
import { cn } from "@os-glass/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

export interface DatePickerInputProps extends Omit<React.ComponentProps<typeof Button>, "value" | "onChange"> {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
}

const DatePickerInput = React.forwardRef<HTMLButtonElement, DatePickerInputProps>(
  ({ className, value, onChange, placeholder = "Pick a date", variant = "glass", ...props }, ref) => {
    const [open, setOpen] = React.useState(false);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant={variant}
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground", className)}
            {...props}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" variant="glass">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange?.(date);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  },
);
DatePickerInput.displayName = "DatePickerInput";

export { DatePickerInput };
