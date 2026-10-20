"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { type MaterialAxisProps, materialSurface, splitAxisProps } from "@/lib/material";
import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = {
  light: "",
  dark: ".dark",
} as const;

/* Roles: the container and legend are bordered adaptive glass;
   the tooltip is bordered + veiled. */
const SURFACE_ROLE = {
  border: true,
};
const TOOLTIP_ROLE = {
  border: true,
  veil: true,
};

export type ChartConfig = {
  [key in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | {
        color?: string;
        theme?: never;
      }
    | {
        color?: never;
        theme: {
          light?: string;
          dark?: string;
        };
      }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

type PlotSize = {
  width: number;
  height: number;
};

/**
 * The plot box's size, measured by ONE ResizeObserver on an element whose size comes from CSS alone.
 *
 * Recharts' percent-sized ResponsiveContainer observes its own div, and the container used to give that
 * div `minHeight={150}` inside an `aspect-video` box: measure, grow to the floor, measure again — a
 * ResizeObserver feedback loop WebKit reports as "ResizeObserver loop completed with undelivered
 * notifications" and re-enters every frame. Here the measured box never contains the chart in flow (the
 * chart sits in an absolute layer), so what it measures cannot change what it measures.
 *
 * - `null` until the first non-empty measurement: nothing renders at 0×0, which is what a chart in a
 *   hidden (display: none) tab measures, and why recharts warned "width(0) and height(0) of chart
 *   should be greater than 0" on every pass.
 * - A 0×0 measurement after that is ignored, so a tab that hides keeps its last size rather than
 *   unmounting the chart.
 * - `"unobserved"` when there is no ResizeObserver: the caller falls back to the percent container.
 */
function usePlotSize(ref: React.RefObject<HTMLDivElement | null>): PlotSize | "unobserved" | null {
  const [size, setSize] = React.useState<PlotSize | "unobserved" | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") {
      setSize("unobserved");
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      if (!box) return;
      /* Floor, not round: a chart half a pixel wider than its layer would overflow it. */
      const width = Math.floor(box.width);
      const height = Math.floor(box.height);
      if (width <= 0 || height <= 0) return;
      setSize((prev) =>
        prev !== null && prev !== "unobserved" && prev.width === width && prev.height === height
          ? prev
          : {
              width,
              height,
            },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    ref,
  ]);

  return size;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  } & MaterialAxisProps & {
      variant?: "default" | "glass";
    }
>(({ id, className, children, config, variant = "glass", ...props }, ref) => {
  const [axes, rest] = splitAxisProps(props);
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const variants = {
    default: "",
    glass: "rounded-lg p-4",
  };

  const m = materialSurface(variant === "default" ? null : SURFACE_ROLE, axes);
  const plotRef = React.useRef<HTMLDivElement>(null);
  const plot = usePlotSize(plotRef);

  return (
    <ChartContext.Provider
      value={{
        config,
      }}
    >
      <div
        data-slot="chart"
        data-chart={chartId}
        data-material={m?.["data-material"]}
        ref={ref}
        className={cn(
          m?.className,
          // Axis tick labels: target the TEXT's own class, not a descendant of .recharts-cartesian-axis-tick.
          // Recharts 3 split the tick group in two — .recharts-cartesian-axis-tick now wraps only the tick
          // LINE, while the label moved to a sibling branch (.recharts-cartesian-axis-tick-labels >
          // .recharts-cartesian-axis-tick-label > text). The old descendant selector matched nothing after
          // the upgrade, so every tick kept Recharts' own `fill="#666"` — grey in all 17 themes, in both
          // modes, which is what made the axes unreadable. .recharts-cartesian-axis-tick-value sits ON the
          // <text> in both Recharts 2 and 3, so it survives the structure change. (A CSS `fill` beats the
          // fill presentation attribute Recharts sets, so no !important is needed.)
          /* ONE size contract: the caller's height (`h-[300px]`), else the aspect. `min-h-[150px]` is the
             floor the old `minHeight={150}` gave the chart, moved onto this box so it no longer feeds back
             through what the observer measures; a caller's min-h-* still wins. */
          "flex min-h-[150px] aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line-line]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          variants[variant],
          className,
        )}
        {...rest}
      >
        <ChartStyle id={chartId} config={config} />
        <div ref={plotRef} data-slot="chart-plot" className="relative min-w-0 flex-1">
          {plot === "unobserved" ? (
            <RechartsPrimitive.ResponsiveContainer minHeight={150}>{children}</RechartsPrimitive.ResponsiveContainer>
          ) : plot ? (
            /* Absolute, so the chart never sizes the box being measured. Numeric width + height take
               recharts' fixed-size path: no size-detector div and no second observer. */
            <div className="absolute inset-0">
              <RechartsPrimitive.ResponsiveContainer width={plot.width} height={plot.height}>
                {children}
              </RechartsPrimitive.ResponsiveContainer>
            </div>
          ) : null}
        </div>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipProps = React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    name?: string;
    type?: string;
    value?: number | string;
    color?: string;
    payload?: {
      fill?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
};

type TooltipPayloadItem = NonNullable<TooltipProps["payload"]>[number];

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  Omit<TooltipProps, "label" | "labelFormatter" | "formatter"> &
    React.ComponentProps<"div"> &
    MaterialAxisProps & {
      variant?: "default" | "glass";
      indicator?: "dot" | "line" | "dashed";
      hideLabel?: boolean;
      hideIndicator?: boolean;
      nameKey?: string;
      labelKey?: string;
      label?: React.ReactNode;
      labelClassName?: string;
      color?: string;
      labelFormatter?: (value: React.ReactNode, payload: TooltipPayloadItem[]) => React.ReactNode;
      formatter?: (
        value: TooltipPayloadItem["value"],
        name: TooltipPayloadItem["name"],
        item: TooltipPayloadItem,
        index: number,
        payload: TooltipPayloadItem["payload"],
      ) => React.ReactNode;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      variant = "glass",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
      ...props
    },
    ref,
  ) => {
    /* This component never forwards unknown props to the DOM — only the axes are consumed. */
    const [axes] = splitAxisProps(props);
    const { config } = useChart();

    /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
    const variants = {
      default: "bg-popover text-popover-foreground border",
      glass: "text-foreground",
    };

    const m = materialSurface(variant === "default" ? null : TOOLTIP_ROLE, axes);

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
      const configItem = getPayloadConfigFromPayload(config, item, key);
      const value = !labelKey && typeof label === "string" ? config[label]?.label || label : configItem?.label;

      if (labelFormatter) {
        return <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>;
      }

      if (!value) {
        return null;
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>;
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== "dot";

    return (
      <div
        ref={ref}
        data-material={m?.["data-material"]}
        className={cn(
          m?.className,
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-md",
          variants[variant],
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload
            ?.filter((item) => item.type !== "none")
            .map((item, index) => {
              const key = `${nameKey || item.name || item.dataKey || "value"}`;
              const configItem = getPayloadConfigFromPayload(config, item, key);
              const indicatorColor =
                color ||
                (
                  item.payload as
                    | {
                        fill?: string;
                      }
                    | undefined
                )?.fill ||
                item.color;

              return (
                <div
                  /* Rows are rebuilt from the payload, in order, on every render, so the position is the
                     identity: `dataKey || name` collided whenever two series shared one. */
                  key={`${index}-${String(item.dataKey ?? item.name ?? "")}`}
                  className={cn(
                    "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                    indicator === "dot" && "items-center",
                  )}
                >
                  {formatter && item?.value !== undefined && item.name ? (
                    formatter(item.value, item.name, item, index, item.payload)
                  ) : (
                    <>
                      {configItem?.icon ? (
                        <configItem.icon />
                      ) : (
                        !hideIndicator && (
                          <div
                            className={cn(
                              "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                              indicator === "dot" && "h-2.5 w-2.5",
                              indicator === "line" && "h-0.5 w-4",
                              indicator === "dashed" && "h-0.5 w-4 border-[1.5px] border-dashed bg-transparent",
                              nestLabel && indicator === "dashed" && "my-0.5",
                            )}
                            style={
                              {
                                "--color-bg": indicatorColor,
                                "--color-border": indicatorColor,
                              } as React.CSSProperties
                            }
                          />
                        )
                      )}
                      <div className={cn("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center")}>
                        <div className="grid gap-1.5">
                          {nestLabel ? tooltipLabel : null}
                          <span className="text-muted-foreground">{configItem?.label || item.name}</span>
                        </div>
                        {item.value != null && (
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {typeof item.value === "number" ? item.value.toLocaleString() : String(item.value)}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

type LegendProps = {
  payload?: Array<{
    value?: string;
    dataKey?: string;
    type?: string;
    color?: string;
    [key: string]: unknown;
  }>;
  verticalAlign?: "top" | "bottom";
};

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    LegendProps &
    MaterialAxisProps & {
      variant?: "default" | "glass";
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, payload, verticalAlign = "bottom", variant = "glass", hideIcon = false, nameKey, ...props }, ref) => {
  /* This component never forwards unknown props to the DOM — only the axes are consumed. */
  const [axes] = splitAxisProps(props);
  const { config } = useChart();

  /* Variant classes carry BEHAVIOR only; the surface comes from materialSurface. */
  const variants = {
    default: "",
    glass: "rounded-lg px-2 py-1",
  };

  const m = materialSurface(variant === "default" ? null : SURFACE_ROLE, axes);

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      data-material={m?.["data-material"]}
      className={cn(m?.className, "flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-2" : "pt-2", variants[variant], className)}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = `${nameKey || item.dataKey || item.value || "value"}`;
          const configItem = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={`${index}-${String(item.value ?? "")}`}
              className={cn("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground")}
            >
              {configItem?.icon && !hideIcon ? (
                <configItem.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {configItem?.label}
            </div>
          );
        })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegend";

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload = "payload" in payload && typeof payload.payload === "object" && payload.payload !== null ? payload.payload : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key as keyof typeof payloadPayload] === "string") {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
}

export { ChartContainer, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent };
