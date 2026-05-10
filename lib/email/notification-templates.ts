import type { EmailTemplate } from '@/lib/email/templates'

const COLORS = {
  primary: '#d4510f',
  dark: '#18170f',
  white: '#ffffff',
  lightGray: '#f5f5f5',
  border: '#e5e5e5',
}

/**
 * Email template for new request matched notification
 */
export function newRequestMatchedEmail(
  requestTitle: string,
  requestId: string
): EmailTemplate {
  return {
    subject: `✨ Novo naročilo se ujema z vašo specializacijo — ${requestTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${COLORS.dark}; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, ${COLORS.primary} 0%, #e8380f 100%); color: ${COLORS.white}; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: ${COLORS.lightGray}; padding: 30px; border: 1px solid ${COLORS.border}; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: ${COLORS.primary}; color: ${COLORS.white}; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✨ Novo naročilo</h1>
            <p>Se ujema z vašo specializacijo</p>
          </div>
          <div class="content">
            <h2>Pozdravljeni!</h2>
            <p>Našli smo novo naročilo, ki se odlično ujema z vašimi veščinami in lokalnostjo.</p>
            
            <div style="background: ${COLORS.white}; padding: 20px; border-left: 4px solid ${COLORS.primary}; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin-top: 0; color: ${COLORS.primary};">${requestTitle}</h3>
              <p style="margin: 0;"><strong>ID:</strong> ${requestId}</p>
            </div>

            <p><strong>Kaj zdaj?</strong></p>
            <ul>
              <li>Preglejte naročilo in mu primeren opis</li>
              <li>Če ste zainteresirani, pošljite svojo ponudbo</li>
              <li>Čas za odziv: <strong>2 uri</strong> (garancija odgovora)</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/partner-dashboard/povprasevanja/${requestId}" class="button">Preglej naročilo →</a>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 20px; border-top: 1px solid ${COLORS.border}; padding-top: 20px;">
              <strong>Opomba:</strong> To je avtomatsko pošljen email. Odgovori v roku 2 ur, da ohranite dostop do priložnosti!
            </p>
          </div>
          <div class="footer">
            <p>© LiftGO — Vaš pouzdan partner za storitve</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

/**
 * Email template for 90-minute response deadline (urgent)
 */
export function responseDeadline90minEmail(
  requestTitle: string,
  requestId: string
): EmailTemplate {
  return {
    subject: `🚨 URGENTNO: Naročilo čaka — 30 minut ostalo!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${COLORS.dark}; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #dc2626; color: ${COLORS.white}; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #fef2f2; padding: 30px; border: 2px solid #dc2626; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc2626; color: ${COLORS.white}; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px; }
          .timer { background: ${COLORS.white}; padding: 20px; text-align: center; border-radius: 4px; margin: 20px 0; }
          .timer-value { font-size: 32px; font-weight: bold; color: #dc2626; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 URGENTNO!</h1>
            <p>Naročilo čaka na vaš odziv</p>
          </div>
          <div class="content">
            <h2 style="color: #dc2626;">Hitro — čas se izteka!</h2>
            
            <div class="timer">
              <p style="margin: 0; font-size: 14px; color: #666;">ČAS OSTANE</p>
              <div class="timer-value">30 minut</div>
            </div>

            <p>Naročilo <strong>"${requestTitle}"</strong> ste prejeli pred 90 minutami. Če ne odgovorite v naslednjih 30 minut, se boste izgubili to priložnost.</p>

            <div style="background: #fed7d7; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <strong>⚠️ To je avtomatska opomnik:</strong>
              <p style="margin: 10px 0 0 0;">Če ste že odgovorili, prosimo, ignorirajte to pošto. Hvala!</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/partner/povprasevanja/${requestId}" class="button">ODGOVORI ZDAJ →</a>
            </div>

            <p style="color: #666; font-size: 13px; margin-top: 20px;">
              <strong>Kaj se zgodi, če ne odgovorite?</strong><br>
              LiftGO ima garancijo 2-urnega odgovora. Če ne odgovorite v roku, se bo naročilo avtomatsko dodeljeno drugemu obrtnika in boste izgubili to priložnost.
            </p>
          </div>
          <div class="footer">
            <p>© LiftGO — Naročila čakajo na vas!</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

/**
 * Email template for 2H guarantee breach to customer
 */
export function responseDeadlineBreachEmail(
  requestTitle: string,
  context: 'searching' | 'guaranteed'
): EmailTemplate {
  const subject =
    context === 'searching'
      ? `Iščemo alternativo za vaše naročilo "${requestTitle}"`
      : `LiftGO 2-urna garancija aktivirana — povračilo`

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${COLORS.dark}; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: ${context === 'guaranteed' ? '#dc2626' : COLORS.primary}; color: ${COLORS.white}; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: ${COLORS.lightGray}; padding: 30px; border: 1px solid ${COLORS.border}; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${context === 'guaranteed' ? '✅ Garancija aktivirana' : '🔍 Iščemo alternativo'}</h1>
          </div>
          <div class="content">
            <h2>Pozdravljeni!</h2>
            ${
              context === 'searching'
                ? `
              <p>Nobeden od prizadetih obrtnikov ni odgovoril v dovoljenem času za naročilo <strong>"${requestTitle}"</strong>.</p>
              <p>Naš sistem trenutno išče alternativne ponudnike. Kontaktirali vas bomo v najkrajšem možnem času s predlogom.</p>
              <p><strong>Kaj se zgodi naprej:</strong></p>
              <ul>
                <li>Pregled drugih ustreznih obrtnikov</li>
                <li>Pošiljanje naročila na nove ponudnike</li>
                <li>Povratna informacija v 1 uri</li>
              </ul>
            `
                : `
              <p>Ker na vaše naročilo <strong>"${requestTitle}"</strong> ni bilo prejeto odziva v dovoljenem času, ste upravičeni do povračila skladno z <strong>LiftGO 2-urno garancijo</strong>.</p>
              <p><strong>Status povračila: V obdelavi</strong></p>
              <p>Povračilo bo obdelano v naslednjih 3-5 delovnih dni.</p>
            `
            }
            <div style="background: ${COLORS.white}; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Naročilo:</strong> ${requestTitle}</p>
            </div>
          </div>
          <div class="footer">
            <p>© LiftGO — Vaša zadovoljstvo je naša prioriteta</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

/**
 * Email template when guarantee is activated
 */
export function guaranteeActivatedEmail(requestTitle: string): EmailTemplate {
  return {
    subject: `✅ LiftGO garancija aktivirana — povračilo se procesira`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${COLORS.dark}; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #059669; color: ${COLORS.white}; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: ${COLORS.lightGray}; padding: 30px; border: 1px solid ${COLORS.border}; border-radius: 0 0 8px 8px; }
          .timeline { margin: 20px 0; }
          .timeline-item { background: ${COLORS.white}; padding: 15px; margin: 10px 0; border-left: 4px solid #059669; border-radius: 4px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Garancija aktivirana</h1>
            <p>Povračilo se procesira</p>
          </div>
          <div class="content">
            <h2>Kar se je zgodilo</h2>
            <p>Na vaše naročilo <strong>"${requestTitle}"</strong> ni bilo prejeto odziva v garantiranem roku 2 ur.</p>

            <p><strong>LiftGO garancija se je aktivirala:</strong></p>
            <div class="timeline">
              <div class="timeline-item">
                <strong>✅ Povračilo odobreno</strong>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Avtomatsko je bilo odobreno povračilo celotnega zneska</p>
              </div>
              <div class="timeline-item">
                <strong>⏳ V obdelavi</strong>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Povračilo bo obdelano v 3-5 delovnih dni</p>
              </div>
              <div class="timeline-item">
                <strong>💳 Povračilo na račun</strong>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Primit boste e-pošto s potrditvijo prenosa</p>
              </div>
            </div>

            <div style="background: #f0fdf4; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #059669;">
              <p style="margin: 0;"><strong>Kaj je LiftGO garancija?</strong></p>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Vsako naročilo ima garancijo 2-urnega odziva obrtnika. Če ne dobite odziva, vam povrnemo denar.</p>
            </div>

            <p style="color: #666; font-size: 13px; margin-top: 20px;">
              Če imate vprašanja ali potrebujete dodatno pomoč, nam pišite na support@liftgo.net.
            </p>
          </div>
          <div class="footer">
            <p>© LiftGO — Standardi, na katere se lahko zanašate</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

/**
 * Email template when offer is accepted
 */
export function offerAcceptedEmail(requestTitle: string): EmailTemplate {
  return {
    subject: `🎉 Ponudba sprejeta! — "${requestTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${COLORS.dark}; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: ${COLORS.white}; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: ${COLORS.lightGray}; padding: 30px; border: 1px solid ${COLORS.border}; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #059669; color: ${COLORS.white}; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Ponudba sprejeta!</h1>
          </div>
          <div class="content">
            <h2>Čestitke!</h2>
            <p>Vaša ponudba za naročilo <strong>"${requestTitle}"</strong> je bila sprejeta!</p>
            
            <div style="background: ${COLORS.white}; padding: 20px; border-left: 4px solid #059669; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;"><strong>Kaj je sledeče?</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Dogovorite se s stranko o termin in lokaciji</li>
                <li>Izvedite storitev po dogovorjenih pogojih</li>
                <li>Po zaključku poiščite povratno informacijo</li>
              </ul>
            </div>

            <p style="color: #666; font-size: 13px; margin-top: 20px;">
              Stranka vas bo kontaktirala v kratkem času za dogovor o podrobnostih.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/partner/active-jobs" class="button">Preglej aktivna naročila →</a>
            </div>
          </div>
          <div class="footer">
            <p>© LiftGO — Uspeh skupaj!</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

/**
 * Email template for new review notification
 */
export function newReviewReceivedEmail(rating: number, review: string): EmailTemplate {
  const stars = '⭐'.repeat(Math.floor(rating))
  return {
    subject: `${stars} Novo mnenje od stranke — ${rating} od 5`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${COLORS.dark}; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: ${COLORS.white}; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: ${COLORS.lightGray}; padding: 30px; border: 1px solid ${COLORS.border}; border-radius: 0 0 8px 8px; }
          .rating { font-size: 32px; text-align: center; margin: 20px 0; }
          .review-box { background: ${COLORS.white}; padding: 20px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0; font-style: italic; color: #555; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${stars}</h1>
            <p>Novo mnenje od stranke</p>
          </div>
          <div class="content">
            <h2>Hvala za vašo delo!</h2>
            
            <div class="rating">${stars}</div>
            
            ${review ? `<div class="review-box">"${review}"</div>` : ''}

            <p style="text-align: center; color: #666; font-size: 13px; margin-top: 20px;">
              Ta povratna informacija bo pripomoči k izboljšanju vaše reputacije in privlačenju več strank. Hvala!
            </p>
          </div>
          <div class="footer">
            <p>© LiftGO — Vaša reputacija je vaša prednost</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

/**
 * Email template for subscription expiring notification
 */
export function subscriptionExpiringEmail(
  tier: 'START' | 'PRO',
  expiryDate: string
): EmailTemplate {
  return {
    subject: `Opomnik: Vaša ${tier} naročnina LiftGO izteka čez 7 dni`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${COLORS.dark}; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: ${COLORS.primary}; color: ${COLORS.white}; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: ${COLORS.lightGray}; padding: 30px; border: 1px solid ${COLORS.border}; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: ${COLORS.primary}; color: ${COLORS.white}; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Opomnik naročnine</h1>
            <p>Čez 7 dni izteka</p>
          </div>
          <div class="content">
            <h2>Pozdravljeni!</h2>
            <p>Vaša <strong>${tier}</strong> naročnina bo potekla dne <strong>${expiryDate}</strong>.</p>

            <div style="background: ${COLORS.white}; padding: 20px; border-left: 4px solid ${COLORS.primary}; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;"><strong>Kaj se zgodi:</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Po preteku roka se vaš dostop do ${tier} funkcij onemogočijo</li>
                <li>Ohraniti si boste lahko bazo obrtnikov in prejšnjih naročil</li>
                <li>Kadarkoli se lahko ponovno naročite</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/partner/subscription" class="button">Podaljšaj naročnino →</a>
            </div>

            <p style="color: #666; font-size: 13px; margin-top: 20px;">
              Kadar koli imeti vprašanja glede vaše naročnine, se obrnite na support@liftgo.net.
            </p>
          </div>
          <div class="footer">
            <p>© LiftGO — Ostani pripravljen na naslednja naročila</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}
