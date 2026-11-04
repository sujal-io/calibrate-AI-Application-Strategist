import { getAuth } from "@clerk/express";
import { createHash, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  next();
};

// Hash both values first so they always have the same length, then compare
// them in constant time. This stops attackers from guessing the key by timing
// how fast the server answers.
const safeEqual = (a: string, b: string): boolean => {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
};

// True only when the request carries the correct service key AND the server
// has both a key and an owner account configured. If either environment
// variable is missing, the service key is switched off completely.
const hasValidServiceKey = (req: Request): boolean => {
  const expectedKey = process.env.MCP_SERVICE_KEY;
  const ownerId = process.env.MCP_SERVICE_USER_ID;
  const providedKey = req.header("x-service-key");

  if (!expectedKey || !ownerId || !providedKey) {
    return false;
  }

  return safeEqual(providedKey, expectedKey);
};

// Who is calling? A valid service key means "the owner account". Anything
// else falls back to the normal Clerk login.
export const getUserId = (req: Request): string | null => {
  if (hasValidServiceKey(req)) {
    return process.env.MCP_SERVICE_USER_ID as string;
  }

  return getAuth(req).userId ?? null;
};

// Like requireAuth, but also lets the service key through. Use it only on the
// few routes the MCP server needs.
export const requireAuthOrServiceKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!getUserId(req)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  next();
};