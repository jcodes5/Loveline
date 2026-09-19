import { describe, expect, it } from "vitest";

import { formatDailyDate } from "./use-daily-content";

describe("formatDailyDate", () => {
  it("formats a local calendar date for the Home greeting", () => {
    expect(formatDailyDate(new Date(2025, 9, 14))).toBe("Tuesday, October 14");
  });
});
