import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { ZodError } from "zod";
import { AnalyzeJobDescriptionSchema } from "./jobDescription.validation.js";
import { analyzeJobDescription } from "./jobDescription.service.js";

export const analyzeJobDescriptionController = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate request body
    const { jobDescription } = AnalyzeJobDescriptionSchema.parse(req.body);

    // Get authenticated user's Clerk ID
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Analyze the job description and calculate resume match
    const result = await analyzeJobDescription(userId, jobDescription);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown job analysis error.";
  console.error("Job description analysis failed:", error);

  // Zod validation error
  if (error instanceof ZodError) {
  return res.status(400).json({
    success: false,
    message: "Invalid request body.",
    errors: error.flatten(),
  });
}

  // Resume not uploaded
  if (error instanceof Error && error.message === "Resume not found.") {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  // Gemini/AI errors
  if (
    error instanceof Error &&
    (error.message.includes("Gemini") ||
      error.message.includes("generateContent"))
  ) {
    return res.status(502).json({
      success: false,
      message: "AI service is temporarily unavailable.",
    });
  }

  // Unexpected errors
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Job description analysis failed. Please try again."
        : `Job description analysis failed: ${errorMessage}`,
  });
}
};
