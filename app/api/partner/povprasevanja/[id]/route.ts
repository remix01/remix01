import { getPartner } from "@/lib/supabase-partner";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, fail } from "@/lib/api/response";
import {
  getDefaultFrom,
  getResendClient,
  resolveEmailRecipients,
} from "@/lib/resend";
import {
  checkEmailRateLimit,
  escapeHtml,
  sanitizeText,
} from "@/lib/email/security";
import { writeEmailLog } from "@/lib/email/email-logs";

const resend = getResendClient();

/**
 * PATCH — partner accepts/rejects/completes inquiry
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const partner = await getPartner();
  if (!partner) return fail("UNAUTHORIZED", "Unauthorized", 401);

  const { id } = await params;

  // Verify this inquiry belongs to this partner
  const { data: inquiry } = await supabaseAdmin
    .from("povprasevanja")
    .select("*")
    .eq("id", id)
    .eq("obrtnik_id", partner.id)
    .single();

  if (!inquiry) return fail("INQUIRY_NOT_FOUND", "Not found", 404);

  const body = await req.json();
  const { status, cena_ocena_min, cena_ocena_max, opomba } = body;

  // Validate allowed partner status transitions
  const allowedTransitions: Record<string, string[]> = {
    dodeljeno: ["sprejeto", "zavrnjeno"],
    sprejeto: ["v_izvajanju", "zavrnjeno"],
    v_izvajanju: ["zakljuceno"],
  };

  if (status && !allowedTransitions[inquiry.status]?.includes(status)) {
    return fail(
      "INVALID_STATUS_TRANSITION",
      `Ne morete spremeniti statusa iz ${inquiry.status} v ${status}`,
      400,
    );
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (cena_ocena_min) updates.cena_ocena_min = cena_ocena_min;
  if (cena_ocena_max) updates.cena_ocena_max = cena_ocena_max;
  if (opomba) updates.opomba = opomba;

  const { data, error } = await supabaseAdmin
    .from("povprasevanja")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return fail("INQUIRY_UPDATE_FAILED", error.message, 500);

  // Email stranka on accept
  if (status === "sprejeto" && inquiry.stranka_email && resend) {
    const acceptRateLimit = await checkEmailRateLimit({
      request: req,
      action: "admin_test",
      email: inquiry.stranka_email,
      userId: partner.id,
    });

    if (!acceptRateLimit.allowed) {
      await writeEmailLog({
        email: inquiry.stranka_email,
        type: "partner_to_customer_status_update",
        status: "rate_limited",
        userId: partner.id,
        errorMessage: `Rate limited by ${acceptRateLimit.reason}`,
        metadata: {
          endpoint: "/api/partner/povprasevanja/[id]",
          inquiryId: id,
          status: "sprejeto",
        },
      });
    } else {
      try {
        await writeEmailLog({
          email: inquiry.stranka_email,
          type: "partner_to_customer_status_update",
          status: "pending",
          userId: partner.id,
          metadata: {
            endpoint: "/api/partner/povprasevanja/[id]",
            inquiryId: id,
            status: "sprejeto",
          },
        });

        const safePartnerName = escapeHtml(
          sanitizeText(`${partner.ime} ${partner.priimek}`.trim(), 160),
        );
        const safePartnerFirstName = sanitizeText(
          partner.ime || "Mojster",
          120,
        );
        const safeService = escapeHtml(
          sanitizeText(inquiry.storitev || inquiry.title || "storitev", 120),
        );

        const response = await resend.emails.send({
          from: getDefaultFrom(),
          to: resolveEmailRecipients(inquiry.stranka_email).to,
          subject: `✓ ${safePartnerFirstName} je sprejel vaše povpraševanje`,
          html: `
            <h2>Dobra novica!</h2>
            <p><strong>${safePartnerName}</strong> je sprejel vaše povpraševanje za <strong>${safeService}</strong>.</p>
            ${cena_ocena_min ? `<p><strong>Ocenjena cena:</strong> ${cena_ocena_min}–${cena_ocena_max} EUR</p>` : ""}
            <p>Mojster vas bo kmalu kontaktiral za potrditev termina.</p>
            <p style="color:#64748b;font-size:12px">LiftGO — Tvoj lokalni mojster, takoj pri roki.</p>
          `,
        });

        if (response.error) {
          await writeEmailLog({
            email: inquiry.stranka_email,
            type: "partner_to_customer_status_update",
            status: "failed",
            userId: partner.id,
            errorMessage: response.error.message,
            metadata: {
              endpoint: "/api/partner/povprasevanja/[id]",
              inquiryId: id,
              status: "sprejeto",
            },
          });
        } else {
          await writeEmailLog({
            email: inquiry.stranka_email,
            type: "partner_to_customer_status_update",
            status: "sent",
            userId: partner.id,
            resendEmailId: response.data?.id,
            metadata: {
              endpoint: "/api/partner/povprasevanja/[id]",
              inquiryId: id,
              status: "sprejeto",
            },
          });
        }
      } catch (emailError) {
        await writeEmailLog({
          email: inquiry.stranka_email,
          type: "partner_to_customer_status_update",
          status: "failed",
          userId: partner.id,
          errorMessage:
            emailError instanceof Error
              ? emailError.message
              : "Unknown email error",
          metadata: {
            endpoint: "/api/partner/povprasevanja/[id]",
            inquiryId: id,
            status: "sprejeto",
          },
        });
        console.log("[v0] Email send failed silently");
      }
    }
  }

  // Email stranka on reject
  if (status === "zavrnjeno" && inquiry.stranka_email && resend) {
    const rejectRateLimit = await checkEmailRateLimit({
      request: req,
      action: "admin_test",
      email: inquiry.stranka_email,
      userId: partner.id,
    });

    if (!rejectRateLimit.allowed) {
      await writeEmailLog({
        email: inquiry.stranka_email,
        type: "partner_to_customer_status_update",
        status: "rate_limited",
        userId: partner.id,
        errorMessage: `Rate limited by ${rejectRateLimit.reason}`,
        metadata: {
          endpoint: "/api/partner/povprasevanja/[id]",
          inquiryId: id,
          status: "zavrnjeno",
        },
      });
    } else {
      try {
        await writeEmailLog({
          email: inquiry.stranka_email,
          type: "partner_to_customer_status_update",
          status: "pending",
          userId: partner.id,
          metadata: {
            endpoint: "/api/partner/povprasevanja/[id]",
            inquiryId: id,
            status: "zavrnjeno",
          },
        });

        const response = await resend.emails.send({
          from: getDefaultFrom(),
          to: resolveEmailRecipients(inquiry.stranka_email).to,
          subject: "LiftGO — Iščemo vam novega mojstra",
          html: `
            <h2>Obveščamo vas</h2>
            <p>Izbrani mojster trenutno ni na voljo za vaše povpraševanje.</p>
            <p>Naša ekipa vam bo v kratkem dodelila novega mojstra.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/povprasevanje">
              Oddajte novo povpraševanje →
            </a>
          `,
        });

        if (response.error) {
          await writeEmailLog({
            email: inquiry.stranka_email,
            type: "partner_to_customer_status_update",
            status: "failed",
            userId: partner.id,
            errorMessage: response.error.message,
            metadata: {
              endpoint: "/api/partner/povprasevanja/[id]",
              inquiryId: id,
              status: "zavrnjeno",
            },
          });
        } else {
          await writeEmailLog({
            email: inquiry.stranka_email,
            type: "partner_to_customer_status_update",
            status: "sent",
            userId: partner.id,
            resendEmailId: response.data?.id,
            metadata: {
              endpoint: "/api/partner/povprasevanja/[id]",
              inquiryId: id,
              status: "zavrnjeno",
            },
          });
        }
      } catch (emailError) {
        await writeEmailLog({
          email: inquiry.stranka_email,
          type: "partner_to_customer_status_update",
          status: "failed",
          userId: partner.id,
          errorMessage:
            emailError instanceof Error
              ? emailError.message
              : "Unknown email error",
          metadata: {
            endpoint: "/api/partner/povprasevanja/[id]",
            inquiryId: id,
            status: "zavrnjeno",
          },
        });
        console.log("[v0] Email send failed silently");
      }
    }
  }

  // Notify admin on rejection
  if (status === "zavrnjeno") {
    const { error: logError } = await supabaseAdmin.from("admin_log").insert({
      akcija: "PARTNER_REJECTED",
      tabela: "povprasevanja",
      zapis_id: id,
      novo_stanje: { partner_id: partner.id, opomba },
    });
    if (logError) console.error("[admin_log]", logError);
  }

  return ok(data);
}

/**
 * GET — partner's assigned inquiries with filters
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const partner = await getPartner();
  if (!partner) return fail("UNAUTHORIZED", "Unauthorized", 401);

  const { id } = await params;

  // Verify this inquiry belongs to this partner
  const { data, error } = await supabaseAdmin
    .from("povprasevanja")
    .select("*")
    .eq("id", id)
    .eq("obrtnik_id", partner.id)
    .single();

  if (error || !data) return fail("INQUIRY_NOT_FOUND", "Not found", 404);
  return ok(data);
}
