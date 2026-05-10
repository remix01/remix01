import { getAuthenticatedPartner } from "@/lib/partner/resolver";
import { canonicalPartnerService } from "@/lib/partner/service";
import { ok, fail } from "@/lib/api/response";

/**
 * GET — partner's personal KPI stats (canonical: obrtnik_id queries)
 */
export async function GET() {
  const partner = await getAuthenticatedPartner();
  if (!partner) return fail("UNAUTHORIZED", "Unauthorized", 401);

  const stats = await canonicalPartnerService.getStats(partner.partnerId);

  return ok({
    ...stats,
    paket: partner.profile.subscription_tier ?? "start",
  });
}
