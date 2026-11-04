import { Request, Response } from "express";
import { getUserId } from "../../middleware/auth.middleware.js";import { Resume } from "../resume/resume.model.js";
import {
  calibrateSeniority,
  createSeniorityComparison,
  extractEvidence,
} from "./calibrator.service.js";

export const calibrate = async (req: Request, res: Response): Promise<void> => {
  try {
    const clerkId = getUserId(req);

    if (!clerkId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
      return;
    }

    const resume = await Resume.findOne({ clerkId });

    if (!resume) {
      res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
      return;
    }

    const experience = Array.isArray(resume.structuredData?.experience)
      ? resume.structuredData.experience
      : [];
    const technicalExperience = experience.filter(
      (entry: { isTechnicalRole?: boolean }) => entry.isTechnicalRole === true,
    );
    const statedRole =
      technicalExperience[0]?.role ??
      (experience.length > 0
        ? "No technical work experience listed"
        : "No formal work experience listed");

    const bullets = resume.bullets
      .map((bullet) => bullet.text)   
      .filter(
        (text): text is string =>
          typeof text === "string" && text.trim().length > 0,
      );

    if (bullets.length === 0) {
      res.status(400).json({
        success: false,
        message: "Resume contains no bullets.",
      });
      return;
    }

    if (bullets.length < 3) {
      res.status(400).json({
        success: false,
        reason: "INSUFFICIENT_EVIDENCE",
        minimumBullets: 3,
        providedBullets: bullets.length,
        message:
          "At least 3 resume bullets are required for a reliable seniority assessment.",
      });

      return;
    }

    const evidence = await extractEvidence(bullets);

    const result = await calibrateSeniority(evidence);
    const comparison = createSeniorityComparison(statedRole, result.level);

    res.status(200).json({
      success: true,
      evidence,
      result,
      statedRole,
      comparison,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to calibrate resume.",
    });
  }
};
