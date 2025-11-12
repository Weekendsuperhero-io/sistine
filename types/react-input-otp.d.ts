declare module "@onefifteen-z/react-input-otp" {
  import * as React from "react"

  export interface OTPInputProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string
    onChange?: (value: string) => void
    maxLength?: number
    containerClassName?: string
    render?: (props: { value: string; index: number }) => React.ReactNode
  }

  export const OTPInput: React.ForwardRefExoticComponent<
    OTPInputProps & React.RefAttributes<HTMLDivElement>
  >

  export interface OTPInputContextValue {
    slots: Array<{
      char?: string
      hasFakeCaret?: boolean
      isActive?: boolean
    }>
  }

  export const OTPInputContext: React.Context<OTPInputContextValue>

  export interface Area {
    x: number
    y: number
    width: number
    height: number
  }

  export interface Point {
    x: number
    y: number
  }
}

