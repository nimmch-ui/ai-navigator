import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface NavigationContext {
  origin?: string;
  destination?: string;
  transportMode?: string;
  ecoMode?: boolean;
  hazardsOnRoute?: string[];
  weatherConditions?: string;
}

export async function getChatResponse(
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  context?: NavigationContext
): Promise<string> {
  try {
    const systemPrompt = buildSystemPrompt(context);
    
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    conversationHistory.slice(-10).forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });

    messages.push({ role: "user", content: userMessage });

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      max_tokens: 300,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get AI response. Please try again.");
  }
}

function buildSystemPrompt(context?: NavigationContext): string {
  let prompt = `You are an intelligent navigation assistant helping drivers, cyclists, and pedestrians navigate safely and efficiently. Your responses must be:
- SHORT and CONCISE (2-3 sentences maximum)
- SAFE for people who might be driving
- EASY to understand quickly
- PRACTICAL and actionable

`;

  if (context) {
    if (context.origin && context.destination) {
      prompt += `Current Route: From ${context.origin} to ${context.destination}\n`;
    }
    
    if (context.transportMode) {
      prompt += `Transport Mode: ${context.transportMode}\n`;
    }
    
    if (context.ecoMode !== undefined) {
      prompt += `Eco Mode: ${context.ecoMode ? "ON - prioritizing fuel efficiency" : "OFF"}\n`;
    }
    
    if (context.hazardsOnRoute && context.hazardsOnRoute.length > 0) {
      prompt += `Hazards on Route: ${context.hazardsOnRoute.join(", ")}\n`;
    }
    
    if (context.weatherConditions) {
      prompt += `Weather: ${context.weatherConditions}\n`;
    }
  }

  prompt += `\nAnswer questions about routes, hazards, safety, eco-friendly options, and navigation tips. If you don't have specific information, provide general safe driving advice.`;

  return prompt;
}
