import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, fail } from "@/lib/api/response";
import { transitionOnboardingState } from "@/lib/onboarding/state-machine";
import { isPartnerActiveStatus } from "@/lib/onboarding/status";

const isSchemaCompatibilityError = (error: any) => {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "PGRST204" || // missing column in select list
    code === "42703" || // undefined column
    code === "42P01" || // undefined table
    message.includes("column") ||
    message.includes("relation") ||
    message.includes("schema cache")
  );
};

/**
 * POST — create a new partner record after signup
 */
export async function POST(req: Request) {
  try {
    const { user_id, company_name, email } = await req.json();

    if (!user_id || !company_name) {
      return fail("MISSING_REQUIRED_FIELDS", "Missing required fields", 400);
    }

    // Primary path (canonical): obrtnik_profiles
    const { data: canonicalData, error: canonicalError } = await (supabaseAdmin as any)
      .from("obrtnik_profiles")
      .upsert(
        {
          id: user_id,
          business_name: company_name,
          is_verified: false,
        },
        { onConflict: "id" },
      )
      .select("id, business_name, is_verified, created_at")
      .single();

    if (!canonicalError) {
      const onboarding = await transitionOnboardingState(user_id);
      const isActive = isPartnerActiveStatus(onboarding.state);

      return ok(
        {
          id: canonicalData.id,
          user_id,
          business_name: canonicalData.business_name,
          podjetje: canonicalData.business_name,
          email: email ?? null,
          aktiven: isActive,
          canonical_source: "obrtnik_profiles",
          onboarding_state: onboarding.state,
          onboarding_blocked_reasons: onboarding.blockedReasons,
        },
        undefined,
        201,
      );
    }

    if (!isSchemaCompatibilityError(canonicalError)) {
      console.error("[v0] Canonical partner creation error:", canonicalError);
      return fail("PARTNER_CREATE_FAILED", canonicalError.message, 500);
    }

    // Compatibility path (legacy): partners table
    // TODO(migration): remove this legacy write after 14 consecutive days with
    // zero LEGACY_PARTNER_WRITE_COMPAT warnings in production and 100% successful
    // canonical writes to obrtnik_profiles on this endpoint.
    console.warn(
      JSON.stringify({
        level: "warn",
        code: "LEGACY_PARTNER_WRITE_COMPAT",
        endpoint: "/api/partner/create",
        userId: user_id,
        message:
          "Canonical create failed due to schema compatibility. Falling back to legacy partners write path.",
        canonicalError: canonicalError.message,
      }),
    );

    const { data, error } = await supabaseAdmin
      .from("partners")
      .insert({
        user_id,
        podjetje: company_name,
        email,
        aktiven: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[v0] Legacy partner creation error:", error);
      return fail("PARTNER_CREATE_FAILED", error.message, 500);
    }

    const onboarding = await transitionOnboardingState(user_id);
    const isActive = isPartnerActiveStatus(onboarding.state);
    if (data && typeof data === "object") {
      (data as any).aktiven = isActive;
      (data as any).onboarding_state = onboarding.state;
      (data as any).onboarding_blocked_reasons = onboarding.blockedReasons;
    }

    return ok(data, undefined, 201);
  } catch (error) {
    console.error("[v0] Error creating partner:", error);
    return fail("INTERNAL_ERROR", "Internal server error", 500);
  }
}
