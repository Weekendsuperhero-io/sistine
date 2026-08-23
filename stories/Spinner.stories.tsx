import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "@/components/ui/spinner";

/**
 * Spinner is deliberately NOT a glass surface: it is a bordered ring drawn in `--primary`, so it stays
 * visible on every material rather than dissolving into the one behind it. Its only prop is `size`.
 *
 * The Glass / Frosted / Crystal stories that used to live here passed a `variant` this component has
 * never had. Because `SpinnerProps extends React.HTMLAttributes<HTMLDivElement>`, that string was
 * forwarded straight onto the `div`, so each one rendered identically AND logged a React
 * unknown-prop warning. To show a spinner on a material, put it inside that material's surface.
 */
const meta = {
  title: "Sistine/Spinner",
  component: Spinner,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
  argTypes: {
    size: {
      control: "select",
      options: [
        "sm",
        "md",
        "lg",
      ],
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: "md",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
  },
};

/** The ring holds its contrast against whatever surface it is dropped onto. */
export const OnGlassSurfaces: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {(
        [
          "glass",
          "frosted",
          "crystal",
          "chakra",
          "opaque",
        ] as const
      ).map((material) => (
        <div key={material} className="glass glass-border rounded-xl p-6" data-material={material}>
          <Spinner size="md" />
        </div>
      ))}
    </div>
  ),
};
