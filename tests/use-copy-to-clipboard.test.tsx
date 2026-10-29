import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

const { error } = vi.hoisted(() => ({
  error: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: {
    error,
  },
}));
afterEach(() => {
  vi.restoreAllMocks();
  error.mockClear();
});

describe("Clipboard feedback", () => {
  it("waits for the write to succeed before reporting copied", async () => {
    let finish!: () => void;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });
    const { result } = renderHook(useCopyToClipboard);
    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.copy("install command");
    });
    expect(result.current.copied).toBeNull();
    await act(async () => {
      finish();
      await pending;
    });
    expect(result.current.copied).toBe("install command");
    expect(error).not.toHaveBeenCalled();
  });

  it("reports rejected clipboard writes without claiming success or leaking a rejection", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });
    const { result } = renderHook(useCopyToClipboard);
    await act(async () => {
      expect(await result.current.copy("code")).toBe(false);
    });
    expect(result.current.copied).toBeNull();
    expect(error).toHaveBeenCalledOnce();
  });
});
