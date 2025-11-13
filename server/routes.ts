import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getChatResponse, type NavigationContext } from "./services/openai";
import { 
  insertCommunityReportSchema, 
  voteSchema,
  authLoginRequestSchema,
  authRestoreRequestSchema,
  syncPushRequestSchema,
  type CloudUserProfile,
} from "@shared/schema";
import { cloudStorage } from "./cloud/index";
import { hashPassword, verifyPassword } from "./cloud/auth";

const USER_DATA_SCHEMA_VERSION = 1;

const REPORT_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes cooldown

export async function registerRoutes(app: Express): Promise<Server> {
  app.head("/api/health", (_req, res) => {
    res.status(200).end();
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ 
      status: "healthy",
      timestamp: Date.now(),
      version: "1.0.0"
    });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, context } = req.body as {
        message: string;
        history: Array<{ role: "user" | "assistant"; content: string }>;
        context?: NavigationContext;
      };

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await getChatResponse(message, history || [], context);
      
      res.json({ message: response });
    } catch (error) {
      console.error("Chat endpoint error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process chat request"
      });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const minTrustScore = req.query.minTrustScore 
        ? parseInt(req.query.minTrustScore as string) 
        : 0;
      
      let reports = await storage.getCommunityReports();
      
      if (minTrustScore > 0) {
        reports = reports.filter(report => report.trustScore >= minTrustScore);
      }
      
      res.json(reports);
    } catch (error) {
      console.error("Get reports error:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const validatedData = insertCommunityReportSchema.parse(req.body);
      
      const lastReportTime = await storage.getLastReportTime(validatedData.reporterId);
      const now = Date.now();
      
      if (lastReportTime && (now - lastReportTime) < REPORT_COOLDOWN_MS) {
        const remainingMs = REPORT_COOLDOWN_MS - (now - lastReportTime);
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        return res.status(429).json({ 
          error: `Please wait ${remainingSeconds} seconds before submitting another report`,
          remainingSeconds 
        });
      }
      
      const report = await storage.createCommunityReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      console.error("Create report error:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid report data" });
      }
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  app.post("/api/reports/:id/vote", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = voteSchema.parse({ ...req.body, reportId: id });
      
      const updatedReport = await storage.voteOnReport(
        validatedData.reportId,
        validatedData.voterId,
        validatedData.voteType
      );
      
      if (!updatedReport) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      res.json(updatedReport);
    } catch (error) {
      console.error("Vote error:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid vote data" });
      }
      res.status(500).json({ error: "Failed to record vote" });
    }
  });

  // Cloud Sync & Auth Endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = authLoginRequestSchema.parse(req.body);
      
      let cloudUser = await storage.getCloudUserByUsername(validatedData.username);
      
      if (!cloudUser) {
        const { hash, salt } = hashPassword(validatedData.password);
        cloudUser = await storage.createCloudUser(validatedData.username, hash, salt);
        
        const now = Date.now();
        const newProfile: CloudUserProfile = {
          id: cloudUser.id,
          userId: cloudUser.id,
          displayName: validatedData.username,
          preferredLanguage: 'en',
          units: 'metric',
          createdAt: now,
          updatedAt: now,
          version: 1,
          schemaVersion: USER_DATA_SCHEMA_VERSION,
        };
        
        await cloudStorage.profiles.create(newProfile);
        console.log('[Auth] New user registered:', validatedData.username);
      } else {
        if (!verifyPassword(validatedData.password, cloudUser.passwordHash, cloudUser.passwordSalt)) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
      }
      
      const session = cloudStorage.createSession(cloudUser.id);
      
      res.json({
        userId: cloudUser.id,
        username: cloudUser.username,
        sessionToken: session.token,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid login data" });
      }
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.post("/api/auth/restore", async (req, res) => {
    try {
      const validatedData = authRestoreRequestSchema.parse(req.body);
      
      const userId = cloudStorage.validateSession(validatedData.sessionToken);
      if (!userId || userId !== validatedData.userId) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      
      const cloudUser = await storage.getCloudUser(userId);
      if (!cloudUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        userId: cloudUser.id,
        username: cloudUser.username,
        valid: true,
      });
    } catch (error) {
      console.error("Restore error:", error);
      res.status(500).json({ error: "Session restoration failed" });
    }
  });

  app.post("/api/sync/push", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized: Missing session token" });
      }
      
      const token = authHeader.substring(7);
      const userId = cloudStorage.validateSession(token);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid session" });
      }
      
      const validatedData = syncPushRequestSchema.parse(req.body);
      
      if (validatedData.userId !== userId) {
        return res.status(403).json({ error: "Forbidden: User ID mismatch" });
      }
      
      for (const item of validatedData.items) {
        const { payload } = item;
        
        if (payload.type === 'profile') {
          await cloudStorage.profiles.mergeVersion(payload.data);
        } else if (payload.type === 'favorite') {
          await cloudStorage.favorites.mergeVersion(payload.data);
        } else if (payload.type === 'trip') {
          await cloudStorage.history.mergeVersion(payload.data);
        }
      }
      
      res.json({ 
        success: true,
        synced: validatedData.items.length,
        serverTimestamp: Date.now(),
      });
    } catch (error) {
      console.error("Push error:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid sync data" });
      }
      res.status(500).json({ error: "Sync push failed" });
    }
  });

  app.get("/api/sync/pull", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized: Missing session token" });
      }
      
      const token = authHeader.substring(7);
      const userId = cloudStorage.validateSession(token);
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: Invalid session" });
      }
      
      const envelope = await cloudStorage.getUserEnvelope(userId);
      
      if (!envelope) {
        return res.status(404).json({ error: "User data not found" });
      }
      
      res.json({
        envelope,
        serverTimestamp: Date.now(),
      });
    } catch (error) {
      console.error("Pull error:", error);
      res.status(500).json({ error: "Sync pull failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
