import { describe, expect, it } from "vitest";

import { validateMemoryFile } from "@/hooks/use-memories";

function file(type: string, size: number) {
  return { type, size } as File;
}

describe("memory upload validation", () => {
  it("accepts supported image formats below the size limit", () => {
    expect(validateMemoryFile(file("image/jpeg", 1024))).toBeNull();
    expect(validateMemoryFile(file("image/png", 1024))).toBeNull();
    expect(validateMemoryFile(file("image/webp", 1024))).toBeNull();
  });

  it("rejects unsupported formats", () => {
    expect(validateMemoryFile(file("image/gif", 1024))).toBe("Choose a JPG, PNG, or WebP image.");
  });

  it("rejects images over 7 MB", () => {
    expect(validateMemoryFile(file("image/jpeg", 7 * 1024 * 1024 + 1))).toBe("Keep each memory under 7 MB.");
  });
});
