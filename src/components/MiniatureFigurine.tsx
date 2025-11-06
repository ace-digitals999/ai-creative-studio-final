import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sparkles, Download, Upload, RefreshCw, Save, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStateWithLocalStorage } from "@/hooks/useStateWithLocalStorage";

const miniatureSchema = z.object({
  prompt: z.string()
    .min(1, "Description is required")
    .max(2000, "Description must be less than 2000 characters"),
});

const BACKGROUND_TEMPLATES = [
  {
    id: "museum",
    name: "Museum Display",
    description: "professional museum display case with collectible toy box at base, elegant pedestal, soft spotlighting, gallery white walls, museum quality presentation, slightly blurred background",
  },
  {
    id: "glass-vitrine",
    name: "Glass Display Case",
    description: "luxury glass display case with LED strip lighting illuminating the scene, collectible toy box visible at base, black velvet base, premium presentation, background softly blurred with bokeh light effects, crystalline reflections",
  },
  {
    id: "wooden-pedestal",
    name: "Wooden Pedestal",
    description: "elegant wooden pedestal with collectible toy box at base, rich mahogany finish, soft ambient lighting, slightly blurred dark background creating depth, classic display stand",
  },
  {
    id: "toystore-shelf",
    name: "Toy Store Shelf",
    description: "colorful toy store shelf display with other action figures and collectibles visible in blurred background, figurine in original collectible toy box prominently displayed, retail shelf lighting, authentic toy store atmosphere, product boxes and other toys softly out of focus behind",
  },
  {
    id: "dark-luxury",
    name: "Dark Luxury",
    description: "dark luxury background with premium collectible toy box, dramatic spotlight on figurine, black velvet surface, golden accent lighting creating depth, background elegantly blurred, sophisticated premium atmosphere",
  },
  {
    id: "computer-desk",
    name: "Computer Desk Setup",
    description: "modern computer desk setup with figurine displayed prominently, collectible toy box visible behind figurine, gaming keyboard and monitor softly blurred in background, RGB lighting accents, authentic collector's desk environment, background slightly out of focus",
  },
];

const STYLE_OPTIONS = [
  {
    id: "hyper-realistic",
    name: "Hyper Photorealistic",
    description: "ultra realistic, hyper detailed, professional photography, 8k resolution, perfect lighting, DSLR quality",
  },
  {
    id: "clay",
    name: "Clay Style",
    description: "clay sculpture style, smooth clay texture, handcrafted appearance, matte finish, artisan quality",
  },
  {
    id: "cartoon",
    name: "Cartoon",
    description: "cartoon style, vibrant colors, stylized proportions, playful design, animated character look",
  },
  {
    id: "anime",
    name: "Anime",
    description: "anime figure style, detailed shading, dynamic pose, Japanese collectible figure aesthetic",
  },
  {
    id: "realistic-painted",
    name: "Realistic Painted",
    description: "hand-painted miniature, realistic paint job, detailed weathering, tabletop gaming quality",
  },
];

export default function MiniatureFigurine() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [figurinePrompt, setFigurinePrompt] = useStateWithLocalStorage("miniature.prompt", "");
  const [selectedBackground, setSelectedBackground] = useStateWithLocalStorage("miniature.background", "museum");
  const [selectedStyle, setSelectedStyle] = useStateWithLocalStorage("miniature.style", "hyper-realistic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useStateWithLocalStorage<string | null>("miniature.generatedImage", null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFigurine, setUploadedFigurine] = useStateWithLocalStorage<string | null>("miniature.uploadedImage", null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      const fileValidation = z.instanceof(File)
        .refine((f) => f.size <= 10 * 1024 * 1024, "Image must be less than 10MB")
        .refine(
          (f) => ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(f.type),
          "Only PNG, JPEG, and WEBP images are supported"
        )
        .safeParse(file);

      if (!fileValidation.success) {
        const errors = fileValidation.error.errors.map((e) => e.message).join(", ");
        toast.error(errors);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedFigurine(e.target?.result as string);
        toast.success("Figurine image uploaded");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    const validation = miniatureSchema.safeParse({
      prompt: figurinePrompt,
    });

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(", ");
      toast.error(errors);
      return;
    }

    setIsGenerating(true);
    try {
      const backgroundTemplate = BACKGROUND_TEMPLATES.find(bg => bg.id === selectedBackground);
      const styleTemplate = STYLE_OPTIONS.find(s => s.id === selectedStyle);
      
      // Base prompt for 1/7 scale figurine with full body and stand
      const scaleAndFormat = "1/7 scale collectible figure with original collectible toy box, complete full body pose from head to toe, standing on display base with stand, museum quality presentation";
      
      let fullPrompt = "";
      
      if (uploadedFigurine) {
        // Convert data URL to base64
        const base64Data = uploadedFigurine.includes(',') 
          ? uploadedFigurine.split(',')[1] 
          : uploadedFigurine;
        
        // If user uploaded a figurine, transform it into a full body 1/7 scale figure
        fullPrompt = `CRITICAL: Transform this into a ${scaleAndFormat}. IMPORTANT: Even if only the upper body or half body is shown, you MUST create and add the complete lower body including legs, feet, and base. Show the ENTIRE FULL BODY from head to feet. The figure MUST be complete with all body parts visible - torso, arms, legs, and feet standing on a display base. Include the collectible toy box in the scene. ${styleTemplate?.description}. Place on ${backgroundTemplate?.description}. Ultra high resolution, 8k quality, perfect lighting, sharp focus, professional product photography, cinematic depth of field with background slightly blurred. The final result must show a complete full-body figurine with toy box.`;
        
        const { data, error } = await supabase.functions.invoke("remix-images", {
          body: {
            images: [base64Data],
            prompt: fullPrompt,
          },
        });

        if (error) throw error;
        setGeneratedImage(data.imageUrl);
      } else {
        // Generate from text description
        fullPrompt = `A highly detailed ${scaleAndFormat}: ${figurinePrompt}. ${styleTemplate?.description}. Displayed on ${backgroundTemplate?.description}. CRITICAL: The figurine MUST show complete full body from head to feet, including legs and feet, standing on display base with collectible toy box visible in scene. ENTIRE BODY must be visible - no cropping at waist or legs. Ultra high resolution, 8k quality, professional product photography, perfect lighting, sharp focus, extreme detail, museum quality photograph, professional DSLR camera, macro lens, cinematic depth of field with background elements slightly blurred for depth`;
        
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt: fullPrompt,
            style: "photorealistic",
            aspectRatio: "1:1",
            quality: "ultra",
          },
        });

        if (error) throw error;
        setGeneratedImage(data.imageUrl);
      }
      
      toast.success("Miniature display created!");
    } catch (error: any) {
      console.error("Error generating miniature:", error);
      toast.error(error.message || "Failed to create miniature display");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `miniature-${Date.now()}.png`;
    link.click();
  };

  const handleSaveToGallery = async (isPublic: boolean) => {
    if (!generatedImage) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error(t("toast.pleaseSignIn"));
      return;
    }

    setIsSaving(true);
    try {
      const backgroundTemplate = BACKGROUND_TEMPLATES.find(bg => bg.id === selectedBackground);
      const { error } = await (supabase as any)
        .from("gallery_images")
        .insert({
          user_id: user.id,
          image_url: generatedImage,
          prompt: `${figurinePrompt} on ${backgroundTemplate?.name}`,
          style: "miniature",
          is_public: isPublic,
        });

      if (error) throw error;

      toast.success(isPublic ? t("toast.publishedToGallery") : t("toast.savedToGallery"));
      navigate("/gallery");
    } catch (error: any) {
      console.error("Error saving to gallery:", error);
      toast.error(error.message || "Failed to save image");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Controls */}
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow space-y-6 animate-slide-in">
        {/* Upload or Generate Choice */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Upload Figurine Image (Optional)</Label>
          <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-all neon-glow cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="figurine-upload"
            />
            <label htmlFor="figurine-upload" className="cursor-pointer">
              {uploadedFigurine ? (
                <img src={uploadedFigurine} alt="Figurine" className="max-h-32 mx-auto rounded-lg mb-2" />
              ) : (
                <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                Upload your figurine or leave blank to generate from text
              </p>
            </label>
          </div>
          {uploadedFigurine && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadedFigurine(null)}
              className="w-full mt-2"
            >
              Clear Image
            </Button>
          )}
        </div>

        {/* Figurine Description */}
        <div className="running-border">
          <div className="bg-card p-4 rounded-md">
            <Label className="text-sm font-medium mb-2 block">
              Describe Your Miniature Figurine
            </Label>
            <Textarea
              placeholder="Example: A detailed fantasy knight with silver armor and blue cape, heroic pose, intricate details..."
              value={figurinePrompt}
              onChange={(e) => setFigurinePrompt(e.target.value)}
              className="min-h-[100px] bg-card/50 border-border/50 focus:border-primary resize-none transition-all"
              maxLength={2000}
              showCopy={true}
              showClear={true}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {figurinePrompt.length}/2000
            </p>
          </div>
        </div>

        {/* Style Options */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Choose Figurine Style</Label>
          <div className="grid grid-cols-2 gap-3">
            {STYLE_OPTIONS.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedStyle === style.id
                    ? "border-primary bg-primary/10 neon-glow-strong"
                    : "border-border/50 bg-card/50 hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm">{style.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Background Templates */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Choose Display Background</Label>
          <div className="grid grid-cols-2 gap-3">
            {BACKGROUND_TEMPLATES.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setSelectedBackground(bg.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedBackground === bg.id
                    ? "border-primary bg-primary/10 neon-glow-strong"
                    : "border-border/50 bg-card/50 hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm mb-1">{bg.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {bg.description.split(",")[0]}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !figurinePrompt.trim()}
          className="w-full bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 text-primary-foreground font-semibold py-6 neon-glow-strong animate-pulse-glow"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Creating Display...
            </>
          ) : (
            <>
              <Package className="mr-2 h-5 w-5" />
              Create Miniature Display
            </>
          )}
        </Button>
      </Card>

      {/* Preview */}
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow flex flex-col items-center justify-center min-h-[600px] animate-fade-in-up">
        {generatedImage ? (
          <div className="w-full space-y-4">
            <div className="relative group">
              <img
                src={generatedImage}
                alt="Miniature Display"
                className="w-full rounded-lg shadow-2xl neon-glow-strong transition-transform hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end justify-center pb-8 gap-2">
                <Button onClick={handleDownload} className="neon-glow-strong">
                  <Download className="mr-2 h-4 w-4" />
                  {t("common.download")}
                </Button>
                <Button 
                  onClick={() => handleSaveToGallery(false)} 
                  disabled={isSaving}
                  variant="outline"
                  className="neon-glow-strong"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {t("common.save")}
                </Button>
                <Button 
                  onClick={() => handleSaveToGallery(true)} 
                  disabled={isSaving}
                  className="neon-glow-strong"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("common.publish")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center neon-glow animate-neon-pulse">
              <Package className="h-16 w-16 text-primary animate-rotate-slow" />
            </div>
            <p className="text-muted-foreground">Your miniature display will appear here</p>
          </div>
        )}
      </Card>
    </div>
  );
}
