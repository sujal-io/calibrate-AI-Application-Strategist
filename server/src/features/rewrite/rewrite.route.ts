import { Router } from "express";
import { requireAuthOrServiceKey } from "../../middleware/auth.middleware.js";
import { rewriteBulletController } from "./rewrite.controller.js";
import { rewriteLimiter } from "../../middleware/rateLimiter.js";

const router = Router();

router.post("/", rewriteLimiter, requireAuthOrServiceKey, rewriteBulletController);

export default router;