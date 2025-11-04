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
    // Rate limiting: 10 requests per minute for image remixing
    const clientId = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = checkRateLimit(`remix:${clientId}`, 10, 60000);
    
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

    const { images, prompt } = await req.json();
    
    if (!images || !Array.isArray(images) || images.length < 1) {
      return new Response(
        JSON.stringify({ error: "At least one image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (images.length > 4) {
      return new Response(
        JSON.stringify({ error: "Maximum 4 images can be remixed at once" }),
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

    // Create a remix prompt that combines the images
    const remixPrompt = prompt || 
      "Creatively blend and fuse these images together into a single stunning, cohesive artwork. Maintain the best elements of each image while creating smooth transitions and a unified composition. The result should be visually striking and artistically impressive.";

    // For single image, just enhance it
    if (images.length === 1) {
      const enhancedPrompt = `${remixPrompt} Ultra high resolution, stunning details, professional quality.`;
      
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
              content: [
                {
                  type: "text",
                  text: enhancedPrompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: images[0]
                  }
                }
              ]
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!response.ok) {
        console.error("AI gateway error:", response.status, await response.text());
        return new Response(
          JSON.stringify({ error: "Unable to remix image" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const remixedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!remixedImageUrl) {
        console.error("No image in response");
        return new Response(
          JSON.stringify({ error: "Unable to remix image" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ imageUrl: remixedImageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For multiple images, create a descriptive prompt and generate
    const multiImagePrompt = `${remixPrompt} Create an artistic fusion combining elements from ${images.length} different images. Ultra high resolution, stunning composition, professional artistic quality, seamless blending.`;

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
            content: [
              {
                type: "text",
                text: multiImagePrompt
              },
              ...images.map(img => ({
                type: "image_url",
                image_url: { url: img }
              }))
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ error: "Unable to remix images" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const remixedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!remixedImageUrl) {
      console.error("No image in response");
      return new Response(
        JSON.stringify({ error: "Unable to remix images" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl: remixedImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in remix-images:", error);
    
    return new Response(
      JSON.stringify({ error: "Failed to remix images" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
