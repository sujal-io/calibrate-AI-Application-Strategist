import { gemini } from "../../../config/gemini.js";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_BATCH_SIZE = 50;

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
    const response = await gemini.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch,
      config: {
        httpOptions: {
          timeout: 45_000,
        },
      },
    });

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
