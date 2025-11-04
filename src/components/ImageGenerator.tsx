import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Download, RefreshCw, Wand2, Save, Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStateWithLocalStorage } from "@/hooks/useStateWithLocalStorage";

const imageGenSchema = z.object({
  prompt: z.string()
    .min(1, "Prompt is required")
    .max(5000, "Prompt must be less than 5000 characters"),
  style: z.enum(["none", "photorealistic", "anime", "fantasy", "vintage", "cinematic", "abstract", "watercolor", "oil-painting"]),
  seed: z.number().min(0).max(999999),
});

export default function ImageGenerator() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [prompt, setPrompt] = useStateWithLocalStorage("generator.prompt", "");
  const [magicPrompt, setMagicPrompt] = useStateWithLocalStorage("generator.magicPrompt", "");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [style, setStyle] = useStateWithLocalStorage("generator.style", "none");
  const [aspectRatio, setAspectRatio] = useStateWithLocalStorage("generator.aspectRatio", "1:1");
  const [quality, setQuality] = useStateWithLocalStorage("generator.quality", "medium");
  const [seed, setSeed] = useStateWithLocalStorage("generator.seed", Math.floor(Math.random() * 1000000));
  const [negativePrompt, setNegativePrompt] = useStateWithLocalStorage("generator.negativePrompt", "blurry, text, watermark, low quality");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useStateWithLocalStorage<string | null>("generator.generatedImage", null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);

  const translateToEnglish = async (text: string): Promise<string> => {
    if (language === "en") return text;
    // For Farsi, we'll send it as-is to the API which will handle translation
    return text;
  };

  const handleMagicPrompt = async () => {
    if (!prompt.trim()) {
      toast.error(t("toast.enterPrompt"));
      return;
    }

    setIsEnhancing(true);
    try {
      const englishPrompt = await translateToEnglish(prompt);
      const { data, error } = await supabase.functions.invoke("enhance-prompt", {
        body: { prompt: englishPrompt, type: "generate" },
      });

      if (error) throw error;

      setMagicPrompt(data.enhancedPrompt);
      toast.success(t("toast.promptEnhanced"));
    } catch (error: any) {
      console.error("Error enhancing prompt:", error);
      toast.error(error.message || "Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    const finalPrompt = magicPrompt || prompt;
    const validation = imageGenSchema.safeParse({
      prompt: finalPrompt,
      style,
      seed,
    });

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(", ");
      toast.error(errors);
      return;
    }

    setIsGenerating(true);
    try {
      const englishPrompt = await translateToEnglish(finalPrompt);
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: englishPrompt,
          style: style !== "none" ? style : null,
          aspectRatio,
          quality,
          seed,
          negativePrompt,
        },
      });

      if (error) throw error;

      setGeneratedImage(data.imageUrl);
      toast.success(t("toast.imageGenerated"));
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(error.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `ai-generated-${Date.now()}.png`;
    link.click();
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  const handleRemix = async () => {
    if (!generatedImage) return;

    setIsRemixing(true);
    try {
      const { data, error } = await supabase.functions.invoke("remix-images", {
        body: {
          images: [generatedImage],
          prompt: "Enhance and transform this image into an even more stunning, artistic masterpiece with improved details and composition"
        },
      });

      if (error) throw error;

      setGeneratedImage(data.imageUrl);
      toast.success("Image remixed successfully!");
    } catch (error: any) {
      console.error("Error remixing image:", error);
      toast.error(error.message || "Failed to remix image");
    } finally {
      setIsRemixing(false);
    }
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
      const finalPrompt = magicPrompt || prompt;
      const { error } = await supabase
        .from("gallery_images")
        .insert({
          user_id: user.id,
          image_url: generatedImage,
          prompt: finalPrompt,
          style: style !== "none" ? style : null,
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
        <div className="running-border">
          <div className="bg-card p-4 rounded-md">
            <Label className="text-sm font-medium mb-2 block">{t("generator.simplePrompt")}</Label>
            <Textarea
              placeholder={t("generator.simplePromptPlaceholder")}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] bg-card/50 border-border/50 focus:border-primary resize-none transition-all"
              maxLength={5000}
              showCopy={true}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {prompt.length}/5000
            </p>
            <Button
              onClick={handleMagicPrompt}
              disabled={isEnhancing || !prompt.trim()}
              variant="outline"
              className="mt-2 w-full neon-glow"
            >
              {isEnhancing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t("generator.enhancing")}
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  {t("generator.magicEnhance")}
                </>
              )}
            </Button>
          </div>
        </div>

        {magicPrompt && (
          <div className="running-border">
            <div className="bg-card p-4 rounded-md">
              <Label className="text-sm font-medium mb-2 block">{t("generator.enhancedPrompt")}</Label>
              <Textarea
                value={magicPrompt}
                onChange={(e) => setMagicPrompt(e.target.value)}
                className="min-h-[120px] bg-card/50 border-border/50 focus:border-primary resize-none transition-all"
                showCopy={true}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">{t("generator.style")}</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-card/50 border-border/50 neon-glow">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("style.none")}</SelectItem>
                <SelectItem value="photorealistic">{t("style.photorealistic")}</SelectItem>
                <SelectItem value="anime">{t("style.anime")}</SelectItem>
                <SelectItem value="fantasy">{t("style.fantasy")}</SelectItem>
                <SelectItem value="vintage">{t("style.vintage")}</SelectItem>
                <SelectItem value="cinematic">{t("style.cinematic")}</SelectItem>
                <SelectItem value="abstract">{t("style.abstract")}</SelectItem>
                <SelectItem value="watercolor">{t("style.watercolor")}</SelectItem>
                <SelectItem value="oil-painting">{t("style.oilPainting")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">{t("generator.aspectRatio")}</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="bg-card/50 border-border/50 neon-glow">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">{t("ratio.square")}</SelectItem>
                <SelectItem value="16:9">{t("ratio.landscape")}</SelectItem>
                <SelectItem value="9:16">{t("ratio.portrait")}</SelectItem>
                <SelectItem value="4:3">{t("ratio.standard")}</SelectItem>
                <SelectItem value="3:2">{t("ratio.photo")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">{t("generator.quality")}</Label>
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger className="bg-card/50 border-border/50 neon-glow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t("quality.draft")}</SelectItem>
              <SelectItem value="medium">{t("quality.medium")}</SelectItem>
              <SelectItem value="high">{t("quality.high")}</SelectItem>
              <SelectItem value="ultra">{t("quality.ultra")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">{t("generator.seed")}: {seed}</Label>
            <Button size="sm" variant="ghost" onClick={randomizeSeed} className="neon-glow">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Slider
            value={[seed]}
            onValueChange={([value]) => setSeed(value)}
            max={999999}
            step={1}
            className="neon-glow"
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">{t("generator.negativePrompt")}</Label>
          <Textarea
            placeholder={t("generator.negativePromptPlaceholder")}
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="min-h-[80px] bg-card/50 border-border/50 focus:border-primary resize-none"
            showCopy={true}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || (!prompt.trim() && !magicPrompt.trim())}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold py-6 neon-glow-strong animate-pulse-glow"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              {t("generator.generatingImage")}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              {t("generator.generateImage")}
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
                alt="Generated"
                className="w-full rounded-lg shadow-2xl neon-glow-strong transition-transform hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end justify-center pb-8 gap-2">
                <Button onClick={handleDownload} className="neon-glow-strong">
                  <Download className="mr-2 h-4 w-4" />
                  {t("common.download")}
                </Button>
                <Button 
                  onClick={handleRemix} 
                  disabled={isRemixing}
                  variant="outline"
                  className="neon-glow-strong bg-gradient-to-r from-primary/20 to-secondary/20"
                >
                  {isRemixing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shuffle className="mr-2 h-4 w-4" />
                  )}
                  Remix
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
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center neon-glow animate-neon-pulse">
              <Sparkles className="h-16 w-16 text-primary animate-rotate-slow" />
            </div>
            <p className="text-muted-foreground">{t("generator.imagePreview")}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
