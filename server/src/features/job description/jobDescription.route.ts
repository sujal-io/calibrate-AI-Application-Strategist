import { Router } from "express";
import { analyzeJobDescriptionController } from "./jobDescription.controller.js";
import { requireAuthOrServiceKey } from "../../middleware/auth.middleware.js";
import { jobDescriptionLimiter } from "../../middleware/rateLimiter.js";

const router = Router();

router.post("/analyze", jobDescriptionLimiter, requireAuthOrServiceKey, analyzeJobDescriptionController);

export default router;