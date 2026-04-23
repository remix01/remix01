export const ok = (data: any) => Response.json({ success: true, data })

export const fail = (message: string, status = 400) =>
  Response.json({ success: false, error: message }, { status })
