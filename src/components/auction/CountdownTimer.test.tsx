import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { CountdownTimer } from "./CountdownTimer";

// Mock formatTimeRemaining
vi.mock("@/lib/utils/time", () => ({
  formatTimeRemaining: vi.fn(),
}));

import { formatTimeRemaining } from "@/lib/utils/time";

const mockFormatTimeRemaining = vi.mocked(formatTimeRemaining);

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFormatTimeRemaining.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders initial time from formatTimeRemaining", () => {
    mockFormatTimeRemaining.mockReturnValue("2d 5h 30m");
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString();

    render(<CountdownTimer endTime={futureDate} />);

    expect(screen.getByText("2d 5h 30m")).toBeInTheDocument();
  });

  it("renders placeholder when timeLeft is empty", () => {
    mockFormatTimeRemaining.mockReturnValue("");
    const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();

    render(<CountdownTimer endTime={futureDate} />);

    expect(screen.getByText("--:--")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    mockFormatTimeRemaining.mockReturnValue("1h 30m");
    const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();

    render(<CountdownTimer endTime={futureDate} className="custom-class" />);

    const element = screen.getByText("1h 30m");
    expect(element).toHaveClass("custom-class");
    expect(element).toHaveClass("font-mono");
  });

  it("updates time every second via interval", () => {
    mockFormatTimeRemaining
      .mockReturnValueOnce("1h 30m")
      .mockReturnValueOnce("1h 29m")
      .mockReturnValueOnce("1h 28m");

    const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();

    render(<CountdownTimer endTime={futureDate} />);

    expect(screen.getByText("1h 30m")).toBeInTheDocument();

    // Advance timer by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("1h 29m")).toBeInTheDocument();

    // Advance timer by another second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("1h 28m")).toBeInTheDocument();
  });

  it("shows urgent styling when less than 5 minutes remaining", () => {
    mockFormatTimeRemaining.mockReturnValue("4m 30s");
    // Set endTime to 4 minutes from now
    const urgentDate = new Date(Date.now() + 4 * 60 * 1000).toISOString();

    render(<CountdownTimer endTime={urgentDate} />);

    // Trigger interval to check urgency
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const element = screen.getByText("4m 30s");
    expect(element).toHaveClass("text-red-600");
  });

  it("does not show urgent styling when more than 5 minutes remaining", () => {
    mockFormatTimeRemaining.mockReturnValue("10m 30s");
    // Set endTime to 10 minutes from now
    const nonUrgentDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    render(<CountdownTimer endTime={nonUrgentDate} />);

    // Trigger interval
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const element = screen.getByText("10m 30s");
    expect(element).not.toHaveClass("text-red-600");
  });

  it("calls onEnd callback when timer ends", () => {
    const onEnd = vi.fn();
    mockFormatTimeRemaining
      .mockReturnValueOnce("0m 1s")
      .mockReturnValueOnce("Ended");

    const endingDate = new Date(Date.now() + 1000).toISOString();

    render(<CountdownTimer endTime={endingDate} onEnd={onEnd} />);

    expect(onEnd).not.toHaveBeenCalled();

    // Advance to trigger "Ended" state
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("only calls onEnd once even with multiple interval ticks", () => {
    const onEnd = vi.fn();
    mockFormatTimeRemaining.mockReturnValue("Ended");

    const pastDate = new Date(Date.now() - 1000).toISOString();

    render(<CountdownTimer endTime={pastDate} onEnd={onEnd} />);

    // First tick
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Second tick
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Third tick
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should only be called once due to hasEndedRef guard
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("does not call onEnd when onEnd prop is not provided", () => {
    mockFormatTimeRemaining.mockReturnValue("Ended");

    const pastDate = new Date(Date.now() - 1000).toISOString();

    // Should not throw even without onEnd
    expect(() => {
      render(<CountdownTimer endTime={pastDate} />);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }).not.toThrow();
  });

  it("clears interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    mockFormatTimeRemaining.mockReturnValue("1h 30m");

    const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();

    const { unmount } = render(<CountdownTimer endTime={futureDate} />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("resets hasEndedRef when endTime changes to a new active auction", () => {
    const onEnd = vi.fn();

    // First render with an ending auction
    mockFormatTimeRemaining.mockReturnValue("Ended");
    const pastDate = new Date(Date.now() - 1000).toISOString();

    const { rerender, unmount } = render(
      <CountdownTimer endTime={pastDate} onEnd={onEnd} />
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onEnd).toHaveBeenCalledTimes(1);

    // Unmount and remount with new endTime to get fresh component instance
    unmount();

    // Reset mock and render fresh component
    mockFormatTimeRemaining.mockReturnValue("Ended");
    const pastDate2 = new Date(Date.now() - 2000).toISOString();

    render(<CountdownTimer endTime={pastDate2} onEnd={onEnd} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should be called again because it's a new component instance
    expect(onEnd).toHaveBeenCalledTimes(2);
  });
});
