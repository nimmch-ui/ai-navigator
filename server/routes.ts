import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getChatResponse, type NavigationContext } from "./services/openai";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);

  return httpServer;
}
