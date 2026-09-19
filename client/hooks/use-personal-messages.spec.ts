import { describe, expect, it } from "vitest";

import type { PersonalMessageStatus } from "./use-personal-messages";

describe("personal message statuses", () => {
  it("keeps the owner workflow statuses explicit", () => {
    const statuses: PersonalMessageStatus[] = ["draft", "scheduled", "published", "archived"];
    expect(statuses).toEqual(["draft", "scheduled", "published", "archived"]);
  });
});
