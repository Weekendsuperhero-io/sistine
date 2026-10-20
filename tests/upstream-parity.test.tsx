/**
 * Fixes from the review against upstream shadcn (new-york-v4): places where a component lacked what shadcn's
 * has, or did something broken that shadcn's does not. Each test pins one behaviour, not a class string,
 * wherever behaviour is observable in jsdom.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Carousel } from "@/components/ui/carousel";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, tabsListVariants } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/* sonner and the carousel read matchMedia, which jsdom does not implement. The OS here prefers LIGHT. */
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

describe("resizable", () => {
  it("draws the horizontal-bar handle only for a VERTICAL group's separator", () => {
    // react-resizable-panels v4 reports the LINE's orientation: side-by-side panels get a vertical separator.
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel>a</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>b</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const handle = container.querySelector('[data-slot="resizable-handle"]') as HTMLElement;
    expect(handle.getAttribute("aria-orientation")).toBe("vertical");
    expect(handle.className).toContain("aria-[orientation=horizontal]:h-px");
    expect(handle.className).not.toContain("aria-[orientation=vertical]:h-px");
  });
});

describe("input-otp", () => {
  it("supports shadcn's composition: slots addressed by index show what is typed", async () => {
    render(
      <InputOTP maxLength={4}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>,
    );
    await userEvent.type(screen.getByRole("textbox"), "42");
    const slots = document.querySelectorAll('[data-slot="input-otp-slot"]');
    expect(slots).toHaveLength(4);
    expect(slots[0].textContent).toBe("4");
    expect(slots[1].textContent).toBe("2");
  });

  it("merges containerClassName into the surface instead of replacing it", () => {
    const { container } = render(<InputOTP maxLength={4} containerClassName="custom-container" />);
    const box = container.querySelector(".custom-container") as HTMLElement;
    expect(box).not.toBeNull();
    expect(box.className).toContain("flex");
    expect(box.className).toContain("items-center");
  });
});

describe("alert-dialog", () => {
  it("renders Action and Cancel as real Buttons, so they carry the material surface and data attributes", () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Delete?</AlertDialogTitle>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const action = screen.getByText("Delete").closest("button") as HTMLElement;
    const cancel = screen.getByText("Cancel").closest("button") as HTMLElement;
    expect(action.dataset.slot).toBe("alert-dialog-action");
    expect(action.dataset.variant).toBe("destructive");
    expect(action.dataset.glassTint).toBe("destructive");
    expect(cancel.dataset.slot).toBe("alert-dialog-cancel");
    expect(cancel.dataset.variant).toBe("outline");
    expect(cancel.className).not.toContain("mt-2");
  });
});

describe("dialog and sheet", () => {
  it("stamp data-slot on the trigger and on a standalone close", () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogClose>Done</DialogClose>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("Open").dataset.slot).toBe("dialog-trigger");
    expect(screen.getByText("Done").dataset.slot).toBe("dialog-close");
  });

  it("lay the sheet out as a column with the footer pinned to the bottom", () => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
          <SheetFooter>Footer</SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByText("Open").dataset.slot).toBe("sheet-trigger");
    const content = document.querySelector('[data-slot="sheet-content"]') as HTMLElement;
    expect(content.className).toMatch(/\bflex\b/);
    expect(content.className).toMatch(/\bflex-col\b/);
    expect(screen.getByText("Footer").className).toMatch(/\bmt-auto\b/);
  });
});

describe("carousel", () => {
  const slides = () => (
    <Carousel>
      <div>One</div>
      <div>Two</div>
      <div>Three</div>
    </Carousel>
  );

  it("is a labelled region whose controls are named", () => {
    render(slides());
    const region = screen.getByRole("region");
    expect(region.getAttribute("aria-roledescription")).toBe("carousel");
    expect(
      screen.getByRole("button", {
        name: "Previous slide",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Next slide",
      }),
    ).toBeTruthy();
    expect(region.querySelectorAll('[aria-roledescription="slide"]')).toHaveLength(3);
  });

  it("moves with the arrow keys and keeps off-screen slides out of the tab order", () => {
    render(slides());
    const region = screen.getByRole("region");
    const current = () => region.querySelector('[aria-current="true"]')?.getAttribute("aria-label");
    expect(current()).toBe("Go to slide 1");
    fireEvent.keyDown(region, {
      key: "ArrowRight",
    });
    expect(current()).toBe("Go to slide 2");
    fireEvent.keyDown(region, {
      key: "ArrowLeft",
    });
    expect(current()).toBe("Go to slide 1");
    const items = region.querySelectorAll('[data-slot="carousel-item"]');
    expect(items[0].hasAttribute("inert")).toBe(false);
    expect(items[1].hasAttribute("inert")).toBe(true);
  });

  it("offers a pause control when it autoplays", () => {
    render(
      <Carousel autoPlay>
        <div>One</div>
        <div>Two</div>
      </Carousel>,
    );
    const pause = screen.getByRole("button", {
      name: "Pause slideshow",
    });
    fireEvent.click(pause);
    expect(
      screen.getByRole("button", {
        name: "Play slideshow",
      }),
    ).toBeTruthy();
  });
});

describe("sonner", () => {
  afterEach(() => {
    act(() => {
      toast.dismiss();
    });
  });

  it("follows the app's theme, not the OS", async () => {
    // The OS (matchMedia) prefers light; the app is forced dark.
    render(
      <ThemeProvider attribute="class" forcedTheme="dark">
        <Toaster />
      </ThemeProvider>,
    );
    act(() => {
      toast("Saved");
    });
    await waitFor(() => expect(document.querySelector("[data-sonner-toaster]")?.getAttribute("data-sonner-theme")).toBe("dark"));
  });
});

describe("tabs", () => {
  it("lays a vertical list out as a column and exports its variants", () => {
    render(
      <Tabs orientation="vertical" defaultValue="a">
        <TabsList variant="line">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const list = document.querySelector('[data-slot="tabs-list"]') as HTMLElement;
    expect(list.dataset.variant).toBe("line");
    expect(list.className).toContain("group-data-[orientation=vertical]/tabs:flex-col");
    expect(screen.getByText("A").className).toContain("group-data-[orientation=vertical]/tabs:w-full");
    expect(typeof tabsListVariants).toBe("function");
  });
});

describe("toggle-group", () => {
  it("turns spacing into a gap, size into item size, and lets an item override what the group leaves unset", () => {
    render(
      <ToggleGroup type="single" spacing={2}>
        <ToggleGroupItem value="a" size="sm" variant="outline">
          A
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    const root = document.querySelector('[data-slot="toggle-group"]') as HTMLElement;
    expect(root.style.getPropertyValue("--gap")).toBe("2");
    const item = screen.getByText("A");
    expect(item.dataset.size).toBe("sm");
    expect(item.dataset.variant).toBe("outline");
    expect(item.className).toContain("text-xs");
  });
});

describe("select", () => {
  it("shows the error state and stamps the value's slot", () => {
    render(
      <Select>
        <SelectTrigger aria-invalid>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
      </Select>,
    );
    const trigger = document.querySelector('[data-slot="select-trigger"]') as HTMLElement;
    expect(trigger.className).toContain("aria-invalid:border-destructive");
    expect(document.querySelector('[data-slot="select-value"]')).not.toBeNull();
  });
});

describe("smaller fixes", () => {
  it("lets a wide table scroll sideways when asked, keeping the clipped corners", () => {
    const { container } = render(
      <Table scrollX>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const box = container.querySelector('[data-slot="table-container"]') as HTMLElement;
    expect(box.className).toMatch(/\boverflow-x-auto\b/);
    expect(box.className).toMatch(/\boverflow-clip\b/);
  });

  it("announces Input's error prop as aria-invalid", () => {
    render(<Input error placeholder="email" />);
    expect(screen.getByPlaceholderText("email").getAttribute("aria-invalid")).toBe("true");
  });

  it("renders AlertTitle as a div, not a fixed-level heading", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
      </Alert>,
    );
    expect(screen.getByText("Heads up").tagName).toBe("DIV");
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("sizes the spinner like an icon inside a control", () => {
    render(<Spinner />);
    expect(screen.getByRole("status").className).toContain("in-data-[slot=button]:size-4");
  });

  it("uses outline-hidden, never outline-none, so focus survives forced-colors mode", () => {
    const dir = join(process.cwd(), "components/ui");
    const offenders = readdirSync(dir).filter((f) => /\boutline-none\b/.test(readFileSync(join(dir, f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
