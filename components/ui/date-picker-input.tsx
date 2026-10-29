"use client";

import { CalendarIcon } from "@phosphor-icons/react";
import { format, isValid } from "date-fns";
import * as React from "react";
import type { HoverEffect } from "@/lib/hover-effects";
import type { Material } from "@/lib/material";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface DatePickerInputProps extends Omit<React.ComponentPropsWithoutRef<typeof Button>, "value" | "onChange" | "variant" | "children"> {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  variant?: "default" | "glass";
  /** Passed through to the trigger Button and PopoverContent — each resolves its own role. */
  material?: Material;
  effect?: HoverEffect;
}

const DatePickerInput = React.forwardRef<HTMLButtonElement, DatePickerInputProps>(
  ({ className, value, onChange, placeholder = "Pick a date", variant = "glass", material, effect, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const date = value && isValid(value) ? value : undefined;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            {...props}
            variant={variant}
            material={material}
            effect={effect}
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground", className)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" variant={variant} material={material}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => {
              onChange?.(date);
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    );
  },
);
DatePickerInput.displayName = "DatePickerInput";

export { DatePickerInput };
