import { Router } from "express";
import { requireAuthOrServiceKey } from "../../middleware/auth.middleware.js";
import { calibrationLimiter } from "../../middleware/rateLimiter.js";
import { calibrate } from "./calibrator.contoller.js";

const router = Router();

router.post("/", calibrationLimiter, requireAuthOrServiceKey, calibrate);
export default router;