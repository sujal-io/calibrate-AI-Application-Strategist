import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import {
  processResume,
  retrieveResumeContext,
} from "./resume.service.js";

export const uploadResume = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No resume uploaded.",
      });
      return;
    }

    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const resume = await processResume(
      userId,
      req.file.originalname,
      req.file.buffer,
    );

    res.status(201).json({
      success: true,
      message: "Resume uploaded successfully.",
      resume,
    });
  } catch (error) {
    console.error(error);

    const status =
      typeof error === "object" && error !== null && "status" in error
        ? error.status
        : undefined;

    if (status === 429 || status === 503) {
      res.status(status).json({
        success: false,
        message:
          "The AI service is temporarily busy. Please wait a moment and try again.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Upload failed.",
    });
  }
};

export const retrieveContext = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const { jobDescription } = req.body;

    if (!jobDescription) {
      res.status(400).json({
        success: false,
        message: "Job description is required.",
      });
      return;
    }

    const retrievedBullets = await retrieveResumeContext(
      userId,
      jobDescription,
    );

    res.status(200).json({
      success: true,
      retrievedBullets,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve resume context.",
    });
  }
};
