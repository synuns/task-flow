import stylesheet from "@/styles/globals.css?raw";
import { describe, expect, it } from "vitest";

describe("global theme contract", () => {
  it("defines semantic colors and a local Pretendard source", () => {
    expect(stylesheet).toContain("--background:");
    expect(stylesheet).toContain("--foreground:");
    expect(stylesheet).toContain("--primary:");
    expect(stylesheet).toContain("--disabled:");
    expect(stylesheet).toContain("--color-background: var(--background)");
    expect(stylesheet).toContain('url("/fonts/PretendardVariable.woff2")');
    expect(stylesheet).toContain('font-family: "Pretendard"');
  });
});
