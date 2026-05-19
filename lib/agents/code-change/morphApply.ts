import { withRetry } from "./retry";

const MORPH_ENDPOINT =
  process.env.MORPH_ENDPOINT ?? "https://api.morphllm.com/v1/chat/completions";
const MORPH_MODEL = "morph-v2-full";

interface MorphResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

export async function applyCodeChange(
  filePath: string,
  originalContent: string,
  plannedNewContent: string
): Promise<string> {
  if (originalContent === plannedNewContent) {
    return plannedNewContent;
  }

  const apiKey = process.env.MORPH_API_KEY;
  if (!apiKey) {
    console.warn("[morphApply] MORPH_API_KEY not set, using planned content directly");
    return plannedNewContent;
  }

  try {
    const result = await withRetry(
      async () => {
        const res = await fetch(MORPH_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MORPH_MODEL,
            messages: [
              {
                role: "user",
                content: `<original_code file="${filePath}">\n${originalContent}\n</original_code>\n\n<updated_code>\n${plannedNewContent}\n</updated_code>`,
              },
            ],
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw Object.assign(new Error(`Morph API ${res.status}: ${body}`), {
            status: res.status,
          });
        }

        return (await res.json()) as MorphResponse;
      },
      { maxAttempts: 2, baseDelayMs: 1000 }
    );

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty content from Morph API");
    }

    return content;
  } catch (err) {
    console.error("[morphApply] Morph failed, falling back to planned content:", err);
    return plannedNewContent;
  }
}
