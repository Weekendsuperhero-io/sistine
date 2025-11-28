declare module "input-otp" {
  import * as React from "react"

  export interface SlotProps {
    isActive: boolean
    char: string | null
    placeholderChar: string | null
    hasFakeCaret: boolean
  }

  export interface RenderProps {
    slots: SlotProps[]
    isFocused: boolean
    isHovering: boolean
  }

  export interface OTPInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
    value?: string
    onChange?: (newValue: string) => unknown
    maxLength: number
    textAlign?: "left" | "center" | "right"
    onComplete?: (...args: any[]) => unknown
    pushPasswordManagerStrategy?: "increase-width" | "none"
    pasteTransformer?: (pasted: string) => string
    containerClassName?: string
    noScriptCSSFallback?: string | null
    render?: (props: RenderProps) => React.ReactNode
    children?: React.ReactNode
  }

  export const OTPInput: React.ForwardRefExoticComponent<
    OTPInputProps & React.RefAttributes<HTMLInputElement>
  >

  export type { SlotProps, RenderProps }
}

