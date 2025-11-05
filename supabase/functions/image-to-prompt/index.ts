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
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an expert visual analyst and prompt engineer. Analyze this image with EXTREME precision and detail.

Provide a comprehensive, hyper-detailed description covering ALL of these aspects:

1. SUBJECT & COMPOSITION:
   - Main subject(s), positioning, scale, perspective
   - Secondary elements, layering, depth
   - Rule of thirds, leading lines, symmetry/asymmetry
   
2. LIGHTING & ATMOSPHERE:
   - Light source type, direction, intensity, color temperature
   - Shadows (hard/soft, length, color)
   - Ambient lighting, volumetric effects (god rays, fog, haze)
   - Time of day indicators
   
3. COLORS & PALETTE:
   - Dominant, secondary, accent colors (specific hues)
   - Color harmony (complementary, analogous, triadic)
   - Saturation levels, tonal range
   - Color grading style
   
4. TEXTURES & MATERIALS:
   - Surface qualities (rough, smooth, metallic, matte, glossy)
   - Material properties (fabric, wood, stone, glass, water)
   - Detail level (micro vs macro textures)
   
5. ARTISTIC STYLE & TECHNIQUE:
   - Art style (photorealistic, painterly, anime, 3D render, etc.)
   - Technique markers (brush strokes, digital artifacts, film grain)
   - Influences (photography style, art movement, cinematic look)
   
6. MOOD & EMOTION:
   - Overall feeling and atmosphere
   - Emotional tone, energy level
   - Cultural or symbolic elements
   
7. TECHNICAL DETAILS:
   - Apparent camera settings (depth of field, focal length)
   - Image quality indicators (sharpness, noise, dynamic range)
   - Post-processing effects

Be EXTREMELY specific with descriptive language. Use vivid adjectives and precise technical terms. The more detail, the better.`
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
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: `You are a master prompt engineer specializing in AI image generation. Transform this simple idea into an ULTRA-DETAILED, hyper-specific prompt.

User's idea: "${textInput}"
${styleText ? `Required style: ${styleText}` : ""}
${moodText ? `Required mood: ${moodText}` : ""}

Create an extremely detailed description including:

1. SCENE COMPOSITION: Precise subject placement, foreground/midground/background elements, perspective, scale, framing
2. LIGHTING SETUP: Light sources (number, type, direction, color temp), shadow characteristics, ambient light, special lighting effects (rim light, backlighting, volumetric)
3. COLOR PALETTE: Specific color names and harmonies, saturation levels, contrast, color grading style
4. TEXTURES & MATERIALS: Surface qualities of every visible element, material properties, weathering, shine/matte finish
5. ATMOSPHERE & ENVIRONMENT: Weather, time of day, environmental effects (fog, dust, particles), depth cues
6. ARTISTIC STYLE: Rendering technique, art style references, influences, technical execution details
7. CAMERA SETTINGS: Depth of field, focal length feel, shot type, lens characteristics
8. FINE DETAILS: Small elements that add realism, micro-details, imperfections, subtle variations

Use EXTREMELY vivid, precise language. Be as specific as possible. Include technical photography/art terms. The more elaborate, the better.`
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
    
    const modelSystemPrompt = `You are a specialized AI prompt optimizer. Using the detailed description below, create MAXIMALLY DETAILED, platform-optimized prompts for each AI image generation service.

SOURCE DESCRIPTION:
"${basePrompt}"

${negPromptText}

Generate prompts following these EXACT specifications:

1. GENERAL (Universal prompt - 800-1000 chars):
   - Complete, self-contained description
   - Include all visual elements, lighting, mood, style
   - Use vivid, descriptive language
   - Technical photography/art terms

2. KLING_AI (Cinematic video prompt - 800-1000 chars):
   - Focus on motion, camera movements, transitions
   - Include: camera angles, movement dynamics, pacing
   - Specify: shot types, transitions, temporal elements
   - Cinematic language and techniques

3. IDEOGRAM (Concise natural language - 400-450 chars):
   - Crystal-clear, direct description
   - Natural sentence structure
   - Key visual elements prioritized
   - Style keywords at end

4. LEONARDO_AI (Detailed object with prompts):
   - prompt: 800-1000 chars, ultra-detailed positive prompt with all elements
   - negative_prompt: 400-600 chars, comprehensive list of unwanted elements, artifacts, quality issues

5. MIDJOURNEY (Descriptive with parameters - 1200-1500 chars):
   - Rich descriptive language
   - Technical terms and specific details
   - Add parameters: --ar 16:9 --style raw --v 6 --q 2
   - Include lighting, materials, artistic references

6. FLUX (Hyper-detailed technical - 800-1000 chars):
   - Extremely precise descriptions
   - Technical specifications for every element
   - Lighting setup details
   - Material properties and textures
   - Photographic technical terms

CRITICAL: Make EVERY prompt as detailed and specific as possible. Use all available characters. Include minute details, technical specifications, and vivid descriptive language.

Return ONLY valid JSON in this exact format:
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
        model: "google/gemini-2.5-pro",
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
