const { describe, it, expect } = require("@jest/globals");
const fs = require("fs");
const path = require("path");

const ENDPOINT_FILES = [
  "app/api/partner/commissions/route.ts",
  "app/api/partner/create/route.ts",
  "app/api/partner/crm/route.ts",
  "app/api/partner/generate-offer/route.ts",
  "app/api/partner/insights/route.ts",
  "app/api/partner/offers/route.ts",
  "app/api/partner/offers/[id]/route.ts",
  "app/api/partner/stats/route.ts",
  "app/api/partner/profil/route.ts",
  "app/api/partner/povprasevanja/route.ts",
  "app/api/partner/povprasevanja/[id]/route.ts",
  "app/api/craftsman/earnings/route.ts",
];

describe("Partner API envelope contract (canonical ok/fail)", () => {
  it("all migrated endpoints import canonical helper", () => {
    for (const file of ENDPOINT_FILES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toMatch(/from ['"]@\/lib\/api\/response['"]/);
    }
  });

  it("all migrated endpoints use ok() for success envelopes", () => {
    for (const file of ENDPOINT_FILES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toMatch(/\bok\(/);
    }
  });

  it("all migrated endpoints use fail() for error envelopes", () => {
    for (const file of ENDPOINT_FILES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toMatch(/\bfail\(/);
    }
  });

  it("all migrated endpoints avoid legacy NextResponse.json envelope construction", () => {
    for (const file of ENDPOINT_FILES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/NextResponse\.json\(/);
      expect(source).not.toMatch(/\bsuccess\s*:\s*(true|false)/);
    }
  });

  it("canonical helper defines the required envelope shape", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib/api/response.ts"),
      "utf8",
    );

    expect(source).toMatch(/ok:\s*true/);
    expect(source).toMatch(/data:/);
    expect(source).toMatch(/ok:\s*false/);
    expect(source).toMatch(/error:\s*\{/);
    expect(source).toMatch(/code:/);
    expect(source).toMatch(/message:/);
  });
});
