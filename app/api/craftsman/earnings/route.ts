import { ok, fail } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return fail("UNAUTHORIZED", "Unauthorized", 401);
    }

    // Get partner data
    const { data: partner, error: partnerError } = await supabase
      .from("obrtnik_profiles")
      .select("id, stripe_account_id, subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (partnerError || !partner) {
      return fail("PARTNER_NOT_FOUND", "Partner not found", 404);
    }

    // Get all payouts for this craftsman
    const { data: payouts, error: payoutsError } = await supabase
      .from("payouts")
      .select("*")
      .eq("obrtnik_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (payoutsError) {
      console.error("Error fetching payouts:", payoutsError);
      return fail("PAYOUTS_FETCH_FAILED", "Failed to fetch payouts", 500);
    }

    // Calculate statistics
    const totalEarnings =
      payouts?.reduce((sum, p) => sum + (Number(p.amount_eur) || 0), 0) || 0;

    // This month earnings
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthPayouts =
      payouts?.filter((p) => new Date(p.created_at) >= firstDayOfMonth) || [];
    const thisMonthEarnings = thisMonthPayouts.reduce(
      (sum, p) => sum + (Number(p.amount_eur) || 0),
      0,
    );

    // Count accepted ponudbe as paid orders
    const { count: paidOrdersCount } = await supabase
      .from("ponudbe")
      .select("*", { count: "exact", head: true })
      .eq("obrtnik_id", partner.id)
      .eq("status", "sprejeta");

    // Pending payouts: accepted ponudbe without a payout record
    const { data: acceptedPonudbe } = await supabase
      .from("ponudbe")
      .select("id, price_estimate")
      .eq("obrtnik_id", partner.id)
      .eq("status", "sprejeta");

    const acceptedIds = acceptedPonudbe?.map((o: { id: string }) => o.id) || [];
    const paidOutIds =
      (payouts
        ?.map((p: { ponudba_id: string | null }) => p.ponudba_id)
        .filter(Boolean) as string[]) || [];
    const pendingIds = acceptedIds.filter((id) => !paidOutIds.includes(id));

    const pendingPayouts =
      acceptedPonudbe
        ?.filter((o) => pendingIds.includes(o.id))
        ?.reduce((sum, o) => sum + (Number(o.price_estimate) || 0), 0) || 0;

    return ok({
      stripeAccountId: partner.stripe_account_id,
      stripeOnboardingComplete: false,
      subscriptionPlan: partner.subscription_tier || "start",
      statistics: {
        thisMonthEarnings,
        totalEarnings,
        paidOrdersCount: paidOrdersCount || 0,
        pendingPayouts,
      },
      recentPayouts: payouts || [],
    });
  } catch (error) {
    console.error("Error in earnings API:", error);
    return fail("INTERNAL_ERROR", "Internal server error", 500);
  }
}
