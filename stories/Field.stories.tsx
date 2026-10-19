import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const meta = {
  title: "Sistine/Field",
  component: Field,
  parameters: {
    layout: "centered",
  },
  tags: [
    "autodocs",
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Form: Story = {
  render: () => (
    <div className="w-[420px]">
      <FieldSet>
        <FieldLegend>Profile</FieldLegend>
        <FieldDescription>How you appear to others.</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="story-name">Name</FieldLabel>
            <Input id="story-name" placeholder="Ada Lovelace" />
            <FieldDescription>Your full name, as you would like it shown.</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="story-email">Email</FieldLabel>
            <Input id="story-email" aria-invalid defaultValue="ada@" />
            <FieldError
              errors={[
                {
                  message: "Enter a complete email address",
                },
              ]}
            />
          </Field>
          <FieldSeparator>or</FieldSeparator>
          <Field orientation="horizontal">
            <Checkbox id="story-public" defaultChecked />
            <FieldLabel htmlFor="story-public">Show my profile publicly</FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  ),
};

/* A label wrapping a whole Field is a choice card; it lights up while the control inside is checked. */
export const ChoiceCards: Story = {
  render: () => (
    <RadioGroup defaultValue="pro" className="w-[420px]">
      {[
        [
          "starter",
          "Starter",
          "For one person.",
        ],
        [
          "pro",
          "Pro",
          "For small teams.",
        ],
      ].map(([value, title, description]) => (
        <FieldLabel key={value} htmlFor={`plan-${value}`}>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>{title}</FieldTitle>
              <FieldDescription>{description}</FieldDescription>
            </FieldContent>
            <RadioGroupItem value={value} id={`plan-${value}`} />
          </Field>
        </FieldLabel>
      ))}
    </RadioGroup>
  ),
};
