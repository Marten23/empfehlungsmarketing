import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessAdvisorApp,
  getAdvisorPostLoginPath,
  requiresAdvisorActivation,
} from "@/lib/auth/advisor-access";

describe("advisor access states", () => {
  it("allows setup_paid and active_paid", () => {
    assert.equal(canAccessAdvisorApp("setup_paid"), true);
    assert.equal(canAccessAdvisorApp("active_paid"), true);
  });

  it("blocks non-paid states", () => {
    assert.equal(canAccessAdvisorApp("registered"), false);
    assert.equal(canAccessAdvisorApp("checkout_reserved"), false);
    assert.equal(canAccessAdvisorApp("delinquent"), false);
    assert.equal(requiresAdvisorActivation("canceled"), true);
  });

  it("builds post-login path from access flag", () => {
    assert.equal(getAdvisorPostLoginPath(true), "/berater/dashboard");
    assert.equal(getAdvisorPostLoginPath(false), "/berater/aktivierung");
  });
});

