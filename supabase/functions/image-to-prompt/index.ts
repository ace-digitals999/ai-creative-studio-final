import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 15 requests per minute for image-to-prompt
    const clientId = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = checkRateLimit(`imgprompt:${clientId}`, 15, 60000);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter || 60)
          }
        }
      );
    }

    const { imageBase64, textInput, style, mood, negativePrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Generate base prompt from image or enhance text
    let basePrompt = "";
    
    if (imageBase64) {
      // Analyze image to create detailed description
      const imageAnalysisPayload = {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image in extreme detail. Describe the subject, composition, lighting, colors, mood, style, textures, and artistic elements. Create a comprehensive, vivid description suitable for AI image generation."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      };

      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(imageAnalysisPayload),
      });

      if (!imageResponse.ok) {
        console.error("Image analysis error:", imageResponse.status, await imageResponse.text());
        return new Response(
          JSON.stringify({ error: "Unable to analyze image" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const imageData = await imageResponse.json();
      basePrompt = imageData.choices[0].message.content;
    } else if (textInput) {
      // Enhance text input
      const styleText = style ? `Style: ${style}.` : "";
      const moodText = mood ? `Mood: ${mood}.` : "";
      
      const enhancePayload = {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `You are a prompt engineering expert. Transform this idea into a hyper-detailed, vivid description for AI image generation. Elaborate on the scene, environment, lighting, colors, textures, and atmosphere. ${styleText} ${moodText}\n\nIdea: "${textInput}"`
          }
        ]
      };

      const enhanceResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(enhancePayload),
      });

      if (!enhanceResponse.ok) {
        console.error("Enhancement error:", enhanceResponse.status, await enhanceResponse.text());
        return new Response(
          JSON.stringify({ error: "Unable to enhance text" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const enhanceData = await enhanceResponse.json();
      basePrompt = enhanceData.choices[0].message.content;
    }

    // Step 2: Generate model-specific prompts
    const negPromptText = negativePrompt ? `User wants to avoid: "${negativePrompt}".` : "";
    
    const modelSystemPrompt = `Based on the following detailed description, generate optimized prompts for different AI models. Return ONLY valid JSON.

Description: "${basePrompt}"
${negPromptText}

Generate prompts for these models:
- general: Universal detailed prompt (max 1000 chars)
- kling_ai: Cinematic focus with camera movements (max 1000 chars)
- ideogram: Natural language with style keywords (max 450 chars)
- leonardo_ai: Object with "prompt" and "negative_prompt" fields (max 1000 chars each)
- midjourney: Descriptive with parameters like --ar 16:9 (max 1500 chars)
- flux: Clear, highly descriptive (max 1000 chars)

JSON format:
{
  "general": "...",
  "kling_ai": "...",
  "ideogram": "...",
  "leonardo_ai": {"prompt": "...", "negative_prompt": "..."},
  "midjourney": "...",
  "flux": "..."
}`;

    const modelResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: modelSystemPrompt }],
        response_format: { type: "json_object" }
      }),
    });

    if (!modelResponse.ok) {
      console.error("Model generation error:", modelResponse.status, await modelResponse.text());
      return new Response(
        JSON.stringify({ error: "Unable to generate prompts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const modelData = await modelResponse.json();
    const prompts = JSON.parse(modelData.choices[0].message.content);

    return new Response(
      JSON.stringify({ prompts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in image-to-prompt:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate prompts" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
