import express from "express";
import authRoutes from "./features/auth/auth.route.js";
import { clerkMiddleware } from "@clerk/express";
import resumeRoutes from "./features/resume/resume.route.js";
import jobDescriptionRoutes from "./features/job description/jobDescription.route.js";
import calibratorRoutes from "./features/calibrator/calibrator.route.js";
import rewriteRoutes from "./features/rewrite/rewrite.route.js";
import cors from "cors";


const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  clerkMiddleware({
    jwtKey: process.env.CLERK_JWT_KEY,
    authorizedParties: ["http://localhost:5173"],
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/job-description", jobDescriptionRoutes);
app.use("/api/calibrator", calibratorRoutes);
app.use("/api/rewrite", rewriteRoutes);

app.get("/", (_req, res) => {
  res.send("Calibrate API is running");
});

export default app;