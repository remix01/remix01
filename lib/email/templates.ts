export interface EmailTemplate {
  subject: string
  html: string
}

/**
 * Admin alert email for high-risk jobs
 */
export function adminAlertEmail(
  jobId: string,
  score: number,
  flags: string[]
): EmailTemplate {
  const alertLevel = score >= 90 ? 'KRITIČNO' : 'PREGLED POTREBEN'
  const alertColor = score >= 90 ? '#dc2626' : '#f59e0b'

  return {
    subject: `[LiftGO Alert] Job #${jobId} - Risk Score: ${score}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${alertColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .score-badge { display: inline-block; background: ${alertColor}; color: white; padding: 10px 20px; border-radius: 20px; font-size: 24px; font-weight: bold; }
    .flag-list { background: white; padding: 15px; border-left: 4px solid ${alertColor}; margin: 20px 0; }
    .flag-list li { margin: 8px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ ${alertLevel}</h1>
    </div>
    <div class="content">
      <h2>Job #${jobId} zahteva vašo pozornost</h2>
      
      <p><strong>Risk Score:</strong> <span class="score-badge">${score} / 100</span></p>
      
      <div class="flag-list">
        <h3>Zaznane težave:</h3>
        <ul>
          ${flags.map(flag => `<li>${flag}</li>`).join('')}
        </ul>
      </div>

      ${score >= 90 ? `
        <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <strong>⚠️ SAMODEJNI UKREPI:</strong>
          <ul>
            <li>Job status nastavljen na DISPUTED</li>
            <li>Obrtnik začasno suspendiran</li>
            <li>Klepet zaprt</li>
          </ul>
        </div>
      ` : ''}

      <p>Prosimo, preglejte ta job v admin panelu in odločite o nadaljnjih ukrepih.</p>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/jobs/${jobId}" class="button">
        Preglej Job →
      </a>
    </div>
    <div class="footer">
      <p>LiftGO Risk Monitoring System</p>
      <p>Ta email je bil poslan avtomatsko iz varnostnih razlogov.</p>
    </div>
  </div>
</body>
</html>
    `
  }
}

/**
 * Craftworker suspension notification email
 */
export function craftworkerSuspensionEmail(
  name: string,
  reason: string,
  contactEmail: string
): EmailTemplate {
  return {
    subject: 'Vaš LiftGO račun je bil začasno suspendiran',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .warning-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
    .info-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Račun Suspendiran</h1>
    </div>
    <div class="content">
      <p>Pozdravljeni ${name},</p>
      
      <p>Obveščamo vas, da je bil vaš LiftGO račun začasno suspendiran zaradi naslednjega razloga:</p>

      <div class="warning-box">
        <strong>Razlog:</strong><br>
        ${reason}
      </div>

      <h3>Kaj to pomeni?</h3>
      <ul>
        <li>Ne morete prejemati novih povpraševanj</li>
        <li>Vsi aktivni klepeti so bili zaključeni</li>
        <li>Dostop do platforme je začasno omejen</li>
      </ul>

      <h3>Postopek pritožbe</h3>
      <div class="info-box">
        <p>Če menite, da je bila suspenzija napačna ali bi radi pojasnili situacijo, nas kontaktirajte:</p>
        <p><strong>Email:</strong> <a href="mailto:${contactEmail}">${contactEmail}</a></p>
        <p>Odgovorili vam bomo v 2 delovnih dneh.</p>
      </div>

      <h3>Kako preprečiti prihodnje težave?</h3>
      <ul>
        <li>❌ Ne delite kontaktnih podatkov preko klepeta</li>
        <li>❌ Ne poskušajte obiti plačilnega sistema</li>
        <li>✅ Vedno komunicirajte preko LiftGO platforme</li>
        <li>✅ Zaključite delo preko naše platforme</li>
      </ul>

      <p>Hvala za razumevanje.</p>
    </div>
    <div class="footer">
      <p>LiftGO Team</p>
      <p>Kuraltova ulica 12, 4208 Šenčur</p>
    </div>
  </div>
</body>
</html>
    `
  }
}

/**
 * Craftworker unsuspension notification email
 */
export function craftworkerUnsuspensionEmail(name: string): EmailTemplate {
  return {
    subject: 'Vaš LiftGO račun je bil reaktiviran',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .success-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Račun Reaktiviran</h1>
    </div>
    <div class="content">
      <p>Pozdravljeni ${name},</p>
      
      <div class="success-box">
        <p><strong>Dobre novice!</strong> Vaš LiftGO račun je bil uspešno reaktiviran.</p>
      </div>

      <p>Ponovno imate dostop do:</p>
      <ul>
        <li>✅ Prejemanje novih povpraševanj</li>
        <li>✅ Komunikacija s strankami</li>
        <li>✅ Vse funkcije platforme</li>
      </ul>

      <h3>Pomembno opozorilo</h3>
      <p>Za preprečitev prihodnjih težav prosimo:</p>
      <ul>
        <li>Vedno komunicirajte samo preko LiftGO platforme</li>
        <li>Ne delite telefonskih številk, emailov ali drugih kontaktov preko klepeta</li>
        <li>Vse transakcije opravite preko LiftGO plačilnega sistema</li>
      </ul>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}/partner-dashboard" class="button">
        Pojdi na Dashboard →
      </a>

      <p style="margin-top: 30px;">Hvala za sodelovanje in razumevanje!</p>
    </div>
    <div class="footer">
      <p>LiftGO Team</p>
      <p>Kuraltova ulica 12, 4208 Šenčur</p>
    </div>
  </div>
</body>
</html>
    `
  }
}
