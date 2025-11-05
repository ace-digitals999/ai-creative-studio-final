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
    // Rate limiting: 10 requests per minute for image generation
    const clientId = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = checkRateLimit(`generate:${clientId}`, 10, 60000);
    
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

    const { prompt, style, aspectRatio, quality } = await req.json();
    
    // Input validation
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid prompt format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (prompt.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Prompt exceeds maximum length of 5000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const validStyles = ["none", "photorealistic", "anime", "fantasy", "vintage", "cinematic", "abstract", "watercolor", "oil-painting"];
    if (style && !validStyles.includes(style)) {
      return new Response(
        JSON.stringify({ error: "Invalid style parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build enhanced prompt with style
    let enhancedPrompt = prompt;
    if (style && style !== "none") {
      const styleMap: Record<string, string> = {
        photorealistic: "photorealistic, ultra detailed, 8k resolution, professional photography",
        anime: "anime style, vibrant colors, detailed line art, studio quality",
        fantasy: "fantasy art, magical atmosphere, epic scene, concept art quality",
        vintage: "vintage style, retro aesthetic, film grain, classic composition",
        cinematic: "cinematic lighting, dramatic atmosphere, movie quality, epic scene",
        abstract: "abstract art, creative interpretation, artistic style, unique perspective",
        watercolor: "watercolor painting, soft colors, artistic brushstrokes, traditional art",
        "oil-painting": "oil painting style, rich textures, classical art, museum quality"
      };
      enhancedPrompt = `${prompt}, ${styleMap[style] || ""}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ error: "Unable to generate image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI Gateway Response:", JSON.stringify(data, null, 2));
    
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error("No image data in response. Full response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ 
          error: "Unable to generate image. The AI service may be temporarily unavailable or out of credits." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-image:", error);
    
    return new Response(
      JSON.stringify({ error: "Failed to generate image" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
