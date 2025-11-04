import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Sparkles, RefreshCw, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStateWithLocalStorage } from "@/hooks/useStateWithLocalStorage";

export default function ImageToPrompt() {
  const { t, language } = useLanguage();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useStateWithLocalStorage("promptGen.textInput", "");
  const [magicPrompt, setMagicPrompt] = useStateWithLocalStorage("promptGen.magicPrompt", "");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [style, setStyle] = useStateWithLocalStorage("promptGen.style", "none");
  const [mood, setMood] = useStateWithLocalStorage("promptGen.mood", "none");
  const [negativePrompt, setNegativePrompt] = useStateWithLocalStorage("promptGen.negativePrompt", "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompts, setPrompts] = useStateWithLocalStorage<Record<string, any>>("promptGen.prompts", {});
  const [activeTab, setActiveTab] = useState("general");

  const handleMagicPrompt = async () => {
    if (!textInput.trim()) {
      toast.error(t("toast.enterPrompt"));
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-prompt", {
        body: { prompt: textInput, type: "prompt-to-prompt" },
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

  const models = [
    { id: "general", name: "General" },
    { id: "kling_ai", name: "Kling AI" },
    { id: "ideogram", name: "Ideogram" },
    { id: "leonardo_ai", name: "Leonardo AI" },
    { id: "midjourney", name: "MidJourney" },
    { id: "flux", name: "Flux" },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    const finalTextInput = magicPrompt || textInput;
    if (!finalTextInput && !imageFile) {
      toast.error(t("toast.provideInput"));
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

      setPrompts(data.prompts);
      setActiveTab("general");
      toast.success(t("toast.promptsGenerated"));
    } catch (error: any) {
      console.error("Error generating prompts:", error);
      toast.error(error.message || "Failed to generate prompts");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPromptContent = (modelId: string, promptData: any) => {
    if (typeof promptData === "string") {
      return (
        <div className="running-border">
          <div className="bg-card p-2 rounded-md">
            <Textarea
              value={promptData}
              readOnly
              className="min-h-[150px] bg-card/50 border-border/50 text-foreground resize-none transition-all"
              showCopy={true}
            />
          </div>
        </div>
      );
    } else if (promptData?.prompt) {
      return (
        <div className="space-y-4">
          <div className="running-border">
            <div className="bg-card p-2 rounded-md">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">{t("prompt.mainPrompt")}</label>
              <Textarea
                value={promptData.prompt}
                readOnly
                className="min-h-[150px] bg-card/50 border-border/50 text-foreground resize-none transition-all"
                showCopy={true}
              />
            </div>
          </div>
          {promptData.negative_prompt && (
            <div className="running-border">
              <div className="bg-card p-2 rounded-md">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">{t("generator.negativePrompt")}</label>
                <Textarea
                  value={promptData.negative_prompt}
                  readOnly
                  className="min-h-[75px] bg-card/50 border-border/50 text-foreground resize-none transition-all"
                  showCopy={true}
                />
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow animate-slide-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Upload */}
          <div className="flex flex-col items-center justify-center">
            <label
              htmlFor="image-upload"
              className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-primary/50 rounded-xl cursor-pointer hover:border-primary transition-all hover:neon-glow-strong relative overflow-hidden group"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <div className="text-center space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-primary animate-bounce-slow" />
                  <p className="text-sm font-medium gradient-text">{t("prompt.uploadImage")}</p>
                  <p className="text-xs text-muted-foreground">{t("prompt.orDescribe")}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </label>
            <input id="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
          </div>

          {/* Text Input */}
          <div className="flex flex-col space-y-4">
            <div className="running-border">
              <div className="bg-card p-2 rounded-md">
                <Textarea
                  placeholder={t("prompt.description")}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-[80px] bg-card/50 border-border/50 focus:border-primary resize-none transition-all"
                  showCopy={true}
                />
              </div>
            </div>
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
            {magicPrompt && (
              <div className="running-border">
                <div className="bg-card p-2 rounded-md">
                  <Textarea
                    value={magicPrompt}
                    onChange={(e) => setMagicPrompt(e.target.value)}
                    className="min-h-[100px] bg-card/50 border-border/50 focus:border-primary resize-none transition-all"
                    showCopy={true}
                  />
                </div>
              </div>
            )}
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
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">{t("generator.negativePrompt")}</label>
              <Textarea
                placeholder={t("generator.negativePromptPlaceholder")}
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="min-h-[60px] bg-card/50 border-border/50 focus:border-primary resize-none"
                showCopy={true}
              />
            </div>
          </div>
        </div>

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
      {Object.keys(prompts).length > 0 && (
        <Card className="p-8 bg-card/30 backdrop-blur-xl border-border/50 neon-glow animate-fade-in-up">
          <h2 className="text-2xl font-bold mb-6 gradient-text">{t("prompt.generatedPrompts")}</h2>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 bg-card/50 neon-glow">
              {models.map((model) => (
                <TabsTrigger key={model.id} value={model.id} className="data-[state=active]:neon-glow-strong transition-all">
                  {model.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {models.map((model) => (
              <TabsContent key={model.id} value={model.id} className="mt-6">
                {renderPromptContent(model.id, prompts[model.id])}
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      )}
    </div>
  );
}
