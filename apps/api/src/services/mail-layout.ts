const colors = {
  background: "#f6f7f9",
  surface: "#ffffff",
  border: "#e3e7ee",
  text: "#17202c",
  muted: "#657386",
  brand: "#b42318",
  brandSoft: "#fff1f0",
  code: "#fbfcfe"
};

export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
}

export function renderMailLayout(input: {
  title: string;
  intro: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const ctaHtml = input.ctaLabel && input.ctaUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:${colors.brand};color:#ffffff;font-weight:700;text-decoration:none;">${escapeHtml(input.ctaLabel)}</a></p>`
    : "";
  return `<!doctype html>
<html lang="de">
  <body style="margin:0;background:${colors.background};color:${colors.text};font-family:Inter,Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${colors.surface};border:1px solid ${colors.border};border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid ${colors.border};">
                <div style="width:44px;height:44px;line-height:44px;text-align:center;border-radius:14px;background:${colors.brand};color:#ffffff;font-size:18px;font-weight:700;">RB</div>
                <p style="margin:14px 0 0;color:${colors.muted};font-size:13px;">RescueBase · Sanitätslager</p>
                <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;">${escapeHtml(input.title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">${escapeHtml(input.intro)}</p>
                ${input.bodyHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid ${colors.border};background:${colors.brandSoft};color:${colors.muted};font-size:13px;line-height:1.6;">
                Diese Nachricht wurde von RescueBase gesendet. Bitte antworten Sie nicht auf diese E-Mail.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderCodeBlock(code: string): string {
  return `<div style="margin:22px 0 0;padding:18px 20px;border:1px solid ${colors.border};border-radius:16px;background:${colors.code};font-size:30px;font-weight:700;letter-spacing:0.18em;text-align:center;">${escapeHtml(code)}</div>`;
}

export function renderList(items: string[]): string {
  const entries = items.map((item) => `<li style="margin:0 0 10px;">${escapeHtml(item)}</li>`).join("");
  return `<ul style="margin:18px 0 0;padding-left:22px;color:${colors.text};line-height:1.6;">${entries}</ul>`;
}
