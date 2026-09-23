import { gemini } from "../../../config/gemini.js";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_BATCH_SIZE = 50;
const TRANSIENT_RETRY_DELAY_MS = 2_000;
const MAX_TRANSIENT_ATTEMPTS = 5;

const isTransientGeminiError = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const status = "status" in error ? error.status : undefined;
  const message = error instanceof Error ? error.message : "";

  return status === 429 || status === 503 || /\b(429|503)\b/.test(message);
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const generateEmbeddings = async (
  texts: string[],
): Promise<number[][]> => {
  if (texts.length === 0) {
    return [];
  }

  const embeddings: number[][] = [];

  // The Gemini API accepts multiple inputs in one request. Sending an API call
  // per resume bullet made uploads take minutes and often hit quota limits.
  for (let start = 0; start < texts.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(start, start + EMBEDDING_BATCH_SIZE);
    let response;

    for (let attempt = 0; attempt < MAX_TRANSIENT_ATTEMPTS; attempt += 1) {
      try {
        response = await gemini.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: batch,
          config: {
            httpOptions: {
              timeout: 45_000,
            },
          },
        });
        break;
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

    if (!response) {
      throw new Error("Unreachable Gemini embedding retry state");
    }

    const batchEmbeddings = response.embeddings?.map(
      (embedding) => embedding.values ?? [],
    ) ?? [];

    if (batchEmbeddings.length !== batch.length) {
      throw new Error("Gemini returned an incomplete embedding batch.");
    }

    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
};

export const generateEmbedding = async (
  text: string
): Promise<number[]> => {
  const [embedding] = await generateEmbeddings([text]);
  return embedding ?? [];
};
