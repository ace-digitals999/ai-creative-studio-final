import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Sparkles, RefreshCw, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStateWithLocalStorage } from "@/hooks/useStateWithLocalStorage";

const imageToPromptSchema = z.object({
  textInput: z.string().max(5000, "Text input must be less than 5000 characters").optional(),
  imageFile: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "Image must be less than 10MB")
    .refine(
      (file) => ["image/png", "image/jpeg", "image/jpg", "image/webp", "video/mp4", "video/webm"].includes(file.type),
      "Only PNG, JPEG, WEBP images and MP4, WebM videos are supported"
    )
    .optional(),
}).refine((data) => data.textInput || data.imageFile, {
  message: "Either text input or image file must be provided",
});

export default function ImageToPrompt() {
  const { t, language } = useLanguage();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [textInput, setTextInput] = useStateWithLocalStorage("promptGen.textInput", "");
  const [magicPrompt, setMagicPrompt] = useStateWithLocalStorage("promptGen.magicPrompt", "");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [style, setStyle] = useStateWithLocalStorage("promptGen.style", "none");
  const [mood, setMood] = useStateWithLocalStorage("promptGen.mood", "none");
  const [negativePrompt, setNegativePrompt] = useStateWithLocalStorage("promptGen.negativePrompt", "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generalPrompt, setGeneralPrompt] = useStateWithLocalStorage<string>("promptGen.generalPrompt", "");
  const [jsonPrompt, setJsonPrompt] = useStateWithLocalStorage<any>("promptGen.jsonPrompt", null);
  const [activeResultTab, setActiveResultTab] = useState<"general" | "json">("general");

  const handleMagicPrompt = async () => {
    if (!textInput.trim()) {
      toast.error(t("toast.enterPrompt"));
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-prompt", {
        body: { 
          prompt: textInput, 
          type: "prompt-to-prompt",
          language: language // Pass current language for auto-translation
        },
      });

      if (error) throw error;

      setMagicPrompt(data.enhancedPrompt);
      toast.success(t("toast.promptEnhanced"));
    } catch (error: any) {
      console.error("Error enhancing prompt:", error);
      toast.error(error.message || "Failed to enhance description");
    } finally {
      setIsEnhancing(false);
    }
  };

  const extractVideoFrame = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      
      let attemptedExtraction = false;
      let frameExtracted = false;
      
      const cleanup = () => {
        if (video.src && video.src.startsWith('blob:')) {
          URL.revokeObjectURL(video.src);
        }
      };

      const extractFrame = () => {
        if (frameExtracted) return;
        
        try {
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            throw new Error('Invalid video dimensions');
          }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let totalBrightness = 0;
          for (let i = 0; i < data.length; i += 4) {
            totalBrightness += data[i] + data[i + 1] + data[i + 2];
          }
          const avgBrightness = totalBrightness / (data.length / 4) / 3;
          
          if (avgBrightness < 5) {
            throw new Error('Extracted frame is too dark');
          }
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          frameExtracted = true;
          cleanup();
          resolve(dataUrl);
        } catch (error) {
          if (!attemptedExtraction) {
            attemptedExtraction = true;
            video.currentTime = Math.min(2, video.duration / 2);
          } else {
            cleanup();
            reject(error);
          }
        }
      };
      
      video.onloadedmetadata = () => {
        setUploadProgress(30);
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      };

      video.onloadeddata = () => {
        setUploadProgress(60);
        if (video.duration && video.duration > 0) {
          video.currentTime = Math.min(1, video.duration * 0.25);
        } else {
          video.currentTime = 0.5;
        }
      };
      
      video.onseeked = () => {
        setUploadProgress(90);
        extractFrame();
      };
      
      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video. Please use MP4 or WebM format.'));
      };
      
      setUploadProgress(10);
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      video.load();
      
      setTimeout(() => {
        if (!frameExtracted) {
          cleanup();
          reject(new Error('Video processing timeout. File may be corrupted or too large.'));
        }
      }, 15000);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(null);
      setUploadProgress(0);
      const fileType = file.type;
      
      if (fileType.startsWith('video/')) {
        setIsVideo(true);
        setIsProcessingVideo(true);
        toast.info('Processing video...', { duration: 2000 });
        
        try {
          const frameDataUrl = await extractVideoFrame(file);
          setImagePreview(frameDataUrl);
          setUploadProgress(100);
          toast.success('Video frame extracted successfully!');
        } catch (error: any) {
          console.error('Error extracting video frame:', error);
          toast.error(error.message || 'Failed to extract video frame');
          setImageFile(null);
          setIsVideo(false);
        } finally {
          setIsProcessingVideo(false);
          setUploadProgress(0);
        }
      } else {
        setIsVideo(false);
        setUploadProgress(50);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
          setUploadProgress(100);
          setTimeout(() => setUploadProgress(0), 500);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleGenerate = async () => {
    const finalTextInput = magicPrompt || textInput;
    
    const validation = imageToPromptSchema.safeParse({
      textInput: finalTextInput || undefined,
      imageFile: imageFile || undefined,
    });

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(", ");
      toast.error(errors);
      return;
    }

    setIsGenerating(true);
    try {
      let base64Image = null;
      if (imageFile) {
        base64Image = imagePreview?.split(",")[1];
      }

      const { data, error } = await supabase.functions.invoke("image-to-prompt", {
        body: {
          imageBase64: base64Image,
          textInput: finalTextInput,
          style: style !== "none" ? style : null,
          mood: mood !== "none" ? mood : null,
          negativePrompt: negativePrompt || null,
        },
      });

      if (error) throw error;

      // Set general prompt (use general from response or first available)
      const general = data.prompts.general || Object.values(data.prompts)[0];
      if (typeof general === "string") {
        setGeneralPrompt(general);
      } else if (general?.prompt) {
        setGeneralPrompt(general.prompt);
      }

      // Set complete detailed JSON prompt structure for AI APIs
      setJsonPrompt({
        model: "flux-pro",
        prompt: typeof general === "string" ? general : general?.prompt || "",
        negative_prompt: negativePrompt || "blurry, low quality, distorted, ugly, bad anatomy, watermark, text, signature, oversaturated, duplicate, cropped, deformed",
        parameters: {
          width: 1024,
          height: 1024,
          num_inference_steps: 50,
          guidance_scale: 7.5,
          num_outputs: 1,
          scheduler: "K_EULER",
          seed: null,
          sampler: "DPM++ 2M Karras",
          cfg_scale: 7.5,
          clip_skip: 2
        },
        style: style !== "none" ? style : undefined,
        mood: mood !== "none" ? mood : undefined,
        metadata: {
          created_at: new Date().toISOString(),
          version: "1.0",
          api_compatible: ["flux", "stable-diffusion", "midjourney", "dall-e"]
        }
      });

      setActiveResultTab("general");
      toast.success(t("toast.promptsGenerated"));
    } catch (error: any) {
      console.error("Error generating prompts:", error);
      toast.error(error.message || "Failed to generate prompts");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow animate-slide-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Upload Column */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <label
                htmlFor="image-upload"
                className="w-full h-80 flex flex-col items-center justify-center border-2 border-dashed border-primary/50 rounded-xl cursor-pointer hover:border-primary transition-all hover:neon-glow-strong relative overflow-hidden group"
              >
                {isProcessingVideo ? (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                    <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                    <div className="w-3/4">
                      <div className="bg-card/50 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Processing video... {uploadProgress}%
                      </p>
                    </div>
                  </div>
                ) : imagePreview ? (
                  <div className="w-full h-full relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-xl" />
                    {isVideo && (
                      <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                        Video Frame
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Upload className="mx-auto h-12 w-12 text-primary animate-bounce-slow" />
                    <p className="text-sm font-medium gradient-text">{t("prompt.uploadMedia")}</p>
                    <p className="text-xs text-muted-foreground">{t("prompt.orDescribe")}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </label>
              <input 
                id="image-upload" 
                type="file" 
                className="sr-only" 
                accept="image/*,video/*" 
                onChange={handleImageUpload}
                disabled={isProcessingVideo}
              />
            </div>
          </div>

          {/* Text Input Column */}
          <div className="flex flex-col space-y-4">
            {/* Simple Prompt Input */}
            <div className="running-border flex-1">
              <div className="bg-card p-4 rounded-md h-full flex flex-col">
                <label className="text-sm font-medium mb-2 block">{t("prompt.description")}</label>
                <Textarea
                  placeholder="Describe what you want to create..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="flex-1 min-h-[100px] bg-card/50 border-border/50 focus:border-primary resize-none transition-all"
                  maxLength={5000}
                  showCopy={true}
                  showClear={true}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {textInput.length}/5000
                </p>
              </div>
            </div>

            {/* Magic Enhance Button */}
            <Button
              onClick={handleMagicPrompt}
              disabled={isEnhancing || !textInput.trim()}
              variant="outline"
              className="w-full neon-glow"
            >
              {isEnhancing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t("generator.enhancing")}
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  {t("prompt.magicEnhance")}
                </>
              )}
            </Button>

            {/* Enhanced Prompt Display */}
            {magicPrompt && (
              <div className="running-border">
                <div className="bg-card p-4 rounded-md">
                  <label className="text-sm font-medium mb-2 block">{t("generator.enhancedPrompt")}</label>
                  <Textarea
                    value={magicPrompt}
                    onChange={(e) => setMagicPrompt(e.target.value)}
                    className="min-h-[120px] bg-card/50 border-border/50 focus:border-primary resize-none transition-all"
                    showCopy={true}
                    showClear={true}
                  />
                </div>
              </div>
            )}

            {/* Style and Mood Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">{t("generator.style")}</label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="bg-card/50 border-border/50 neon-glow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("style.none")}</SelectItem>
                    <SelectItem value="photorealistic">{t("style.photorealistic")}</SelectItem>
                    <SelectItem value="anime">{t("style.anime")}</SelectItem>
                    <SelectItem value="cinematic">{t("style.cinematic")}</SelectItem>
                    <SelectItem value="fantasy">{t("style.fantasy")}</SelectItem>
                    <SelectItem value="vintage">{t("style.vintage")}</SelectItem>
                    <SelectItem value="abstract">{t("style.abstract")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">{t("prompt.mood")}</label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger className="bg-card/50 border-border/50 neon-glow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("mood.none")}</SelectItem>
                    <SelectItem value="serene">{t("mood.serene")}</SelectItem>
                    <SelectItem value="energetic">{t("mood.energetic")}</SelectItem>
                    <SelectItem value="ominous">{t("mood.ominous")}</SelectItem>
                    <SelectItem value="whimsical">{t("mood.whimsical")}</SelectItem>
                    <SelectItem value="melancholic">{t("mood.melancholic")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Negative Prompt */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">{t("generator.negativePrompt")}</label>
              <Textarea
                placeholder={t("generator.negativePromptPlaceholder")}
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="min-h-[80px] bg-card/50 border-border/50 focus:border-primary resize-none"
                showCopy={true}
                showClear={true}
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || ((!textInput && !magicPrompt) && !imageFile)}
          className="w-full mt-8 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold py-6 neon-glow-strong animate-pulse-glow"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              {t("prompt.generatingPrompts")}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              {t("prompt.generatePrompts")}
            </>
          )}
        </Button>
      </Card>

      {/* Results Section */}
      {(generalPrompt || jsonPrompt) && (
        <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow animate-fade-in-up">
          <h2 className="text-2xl font-bold mb-6 gradient-text">{t("prompt.generatedPrompts")}</h2>
          
          <Tabs value={activeResultTab} onValueChange={(v) => setActiveResultTab(v as "general" | "json")}>
            <TabsList className="grid w-full grid-cols-2 bg-card/50 neon-glow mb-6">
              <TabsTrigger value="general" className="data-[state=active]:neon-glow-strong transition-all">
                Prompt
              </TabsTrigger>
              <TabsTrigger value="json" className="data-[state=active]:neon-glow-strong transition-all">
                .Json prompt
              </TabsTrigger>
            </TabsList>

            {/* Prompt Tab */}
            <TabsContent value="general" className="mt-0">
              <div className="running-border">
                <div className="bg-card p-4 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Enhanced Text Prompt
                  </label>
                  <Textarea
                    value={generalPrompt}
                    onChange={(e) => setGeneralPrompt(e.target.value)}
                    className="min-h-[200px] bg-card/50 border-border/50 text-foreground resize-none transition-all"
                    showCopy={true}
                    showClear={true}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Natural language prompt optimized for image generation
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* .Json prompt Tab */}
            <TabsContent value="json" className="mt-0">
              <div className="running-border">
                <div className="bg-card p-4 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Detailed JSON Configuration
                  </label>
                  <Textarea
                    value={JSON.stringify(jsonPrompt, null, 2)}
                    onChange={(e) => {
                      try {
                        setJsonPrompt(JSON.parse(e.target.value));
                      } catch (err) {
                        // Invalid JSON, don't update
                      }
                    }}
                    className="min-h-[400px] bg-card/50 border-border/50 text-foreground resize-none transition-all font-mono text-sm"
                    showCopy={true}
                    showClear={true}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Comprehensive JSON structure with detailed parameters for AI image generation APIs
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
}
