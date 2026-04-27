import { getAuthenticatedPartner } from "@/lib/partner/resolver";
import { canonicalPartnerService } from "@/lib/partner/service";
import { ok, fail } from "@/lib/api/response";

/**
 * GET — partner's assigned inquiries with filters (canonical: obrtnik_id)
 */
export async function GET(req: Request) {
  const partner = await getAuthenticatedPartner();
  if (!partner) return fail("UNAUTHORIZED", "Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const page = parseInt(searchParams.get("page") || "1");

  try {
    const result = await canonicalPartnerService.getInquiries(
      partner.partnerId,
      {
        status,
        page,
        limit: 10,
      },
    );

    return ok(result);
  } catch (error) {
    console.error("[partner/povprasevanja] error:", error);
    return fail(
      "INQUIRIES_FETCH_FAILED",
      "Napaka pri pridobivanju povpraševanj",
      500,
    );
  }
}
