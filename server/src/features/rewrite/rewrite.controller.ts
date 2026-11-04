import { Request, Response } from "express";
import { getUserId } from "../../middleware/auth.middleware.js";

import { Resume } from "../resume/resume.model.js";
import { rewriteBullet } from "./rewrite.service.js";

export const rewriteBulletController = async (req: Request, res: Response) => {
  try {
    const clerkId = getUserId(req);

    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { bulletId, structuredJobDescription } = req.body;
    if (!bulletId || !structuredJobDescription) {
      return res.status(400).json({
        success: false,
        message: "bulletId and structuredJobDescription are required.",
      });
    }

    const resume = await Resume.findOne({ clerkId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    const bullet = resume.bullets.find(
      (bullet) => bullet.bulletId === bulletId,
    );

    if (!bullet) {
      return res.status(404).json({
        success: false,
        message: "Resume bullet not found.",
      });
    }

    const rewritten = await rewriteBullet(
      bullet.text!,
      structuredJobDescription,
    );

    return res.status(200).json({
      success: true,
      originalBullet: bullet.text,
      rewrittenBullet: rewritten.rewrittenBullet,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to rewrite resume bullet.",
    });
  }
};
