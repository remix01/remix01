# MorphLLM with the OpenAI JavaScript SDK

This example shows a safe and up-to-date way to call MorphLLM through the OpenAI SDK-compatible API.

## What needed updating

- **Do not hardcode API keys in source code**. Use `process.env.MORPH_API_KEY`.
- Keep `baseURL` pointed at MorphLLM: `https://api.morphllm.com/v1`.
- Use deterministic prompt structure and safely read output with a fallback.
- Add basic error handling around the API call.

## Updated example

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.MORPH_API_KEY,
  baseURL: "https://api.morphllm.com/v1",
});

const initialCode = `function greet(name) {
  return "Hello " + name;
}`;

const codeEdit = `function greet(name: string): string {
  return "Hello " + name;
}`;

const instructions = "Add TypeScript types while preserving behavior.";

async function run() {
  try {
    const response = await client.chat.completions.create({
      model: "morph-v3-fast",
      temperature: 0,
      messages: [
        {
          role: "user",
          content:
            `<instruction>${instructions}</instruction>\n` +
            `<code>${initialCode}</code>\n` +
            `<update>${codeEdit}</update>`,
        },
      ],
    });

    const mergedCode = response.choices?.[0]?.message?.content ?? "";
    console.log(mergedCode);
  } catch (error) {
    console.error("MorphLLM request failed:", error);
    process.exitCode = 1;
  }
}

void run();
```

## Environment

```bash
export MORPH_API_KEY="your_morphllm_key"
```
