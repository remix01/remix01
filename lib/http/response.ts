export const ok = (data: Record<string, unknown>, status = 200) =>
  Response.json({ success: true, ...data }, { status })

export const fail = (message: string, status = 400, extra?: Record<string, unknown>) =>
  Response.json({ success: false, error: message, ...extra }, { status })
