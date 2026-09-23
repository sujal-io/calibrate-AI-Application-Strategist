import { Resume } from "../resume/resume.model.js";
import { extractStructuredJobDescription } from "../extraction/extraction.service.js";
import { calculateMatch } from "../matching/matching.service.js";
import { generateRecommendations } from "../recommendations/recommendation.service.js";
import { retrieveRelevantBullets } from "../retrieval/retrieval.service.js";
import { ResumeBullet } from "../leveling/schemas/bullet.schema.js";

export const analyzeJobDescription = async (
  clerkId: string,
  jobDescription: string
) => {
  // Get user's resume
  const resume = await Resume.findOne({ clerkId });

  if (!resume) {
    throw new Error("Resume not found.");
  }

  // Extract structured job description
  const structuredJobDescription =
    await extractStructuredJobDescription(jobDescription);

  // Calculate resume match
  const matchResult = calculateMatch(
    resume.structuredData,
    structuredJobDescription
  );

  // Retrieve the most relevant resume bullets
const retrievedBullets = await retrieveRelevantBullets(
  resume.bullets.map((bullet) => ({
    bulletId: bullet.bulletId!,
    section: bullet.section!,
    company: bullet.company ?? undefined,
    role: bullet.role ?? undefined,
    duration: bullet.duration ?? undefined,
    text: bullet.text!,
    embedding: bullet.embedding,
  })) as ResumeBullet[],
  jobDescription
);

  // Extract only the bullet text for the LLM
  const relevantEvidence = retrievedBullets.map(
    (bullet) => bullet.text
  );

  // Generate AI recommendations
  const recommendations = await generateRecommendations(
    relevantEvidence,
    structuredJobDescription,
    matchResult
  );

  return {
    structuredJobDescription,
    matchResult,
    recommendations,
    retrievedBullets,
  };
};
