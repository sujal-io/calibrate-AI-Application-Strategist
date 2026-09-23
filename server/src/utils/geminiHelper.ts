import { z } from "zod";
import { gemini } from "../config/gemini.js";

const RETRY_INSTRUCTION =
  "\n\nYour previous response was invalid JSON. Return ONLY valid JSON matching the schema, with no extra text.";
const TRANSIENT_RETRY_DELAY_MS = 2_000;
const MAX_TRANSIENT_ATTEMPTS = 5;

const isTransientGeminiError = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const status = "status" in error ? error.status : undefined;
  const message = error instanceof Error ? error.message : "";

 return (
  status === 429 ||
  status === 503 ||
  /\b(429|503)\b/.test(message)
);
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const sanitizeJsonSchemaForGemini = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonSchemaForGemini);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const schema = Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      // Gemini's responseJsonSchema supports enum values, but not JSON Schema's
      // const keyword. Zod emits const for z.literal(), so translate it.
      if (key === "const") {
        return [["enum", [child]]];
      }

      // This is metadata for JSON Schema validators, not part of Gemini's
      // supported responseJsonSchema subset.
      if (key === "$schema") {
        return [];
      }

      return [[key, sanitizeJsonSchemaForGemini(child)]];
    })
  );

  return schema;
};

const parseStructuredResponse = <T>(text: string, schema: z.ZodSchema<T>): T => {
  const cleanedText = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return schema.parse(JSON.parse(cleanedText));
};

const promptPreview = (prompt: string) =>
  prompt.replace(/\s+/g, " ").trim().slice(0, 200);

const generateContentWithRateLimitRetry = async (
  prompt: string,
  responseJsonSchema: unknown
) => {
  for (let attempt = 0; attempt < MAX_TRANSIENT_ATTEMPTS; attempt += 1) {
    try {
      return await gemini.models.generateContent({
        model: process.env.GEMINI_MODEL!,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      });
    } catch (error) {
      if (
        !isTransientGeminiError(error) ||
        attempt === MAX_TRANSIENT_ATTEMPTS - 1
      ) {
        throw error;
      }

      await wait(TRANSIENT_RETRY_DELAY_MS * 2 ** attempt);
    }
  }

  throw new Error("Unreachable Gemini retry state");
};

export const generateStructuredResponse = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>
): Promise<T> => {
  const responseJsonSchema = sanitizeJsonSchemaForGemini(
    z.toJSONSchema(schema, { target: "draft-07" })
  );
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const requestPrompt =
      attempt === 0 ? prompt : `${prompt}${RETRY_INSTRUCTION}`;
    const response = await generateContentWithRateLimitRetry(
      requestPrompt,
      responseJsonSchema
    );

    try {
      return parseStructuredResponse(response.text ?? "", schema);
    } catch (error) {
      lastError = error;
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Gemini structured response failed validation after 2 attempts for model ` +
      `'${process.env.GEMINI_MODEL ?? "unset"}' (prompt preview: ` +
      `'${promptPreview(prompt)}'). Last validation error: ${reason}`,
    { cause: lastError }
  );
};
