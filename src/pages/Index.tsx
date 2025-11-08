import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ImageToPrompt from "@/components/ImageToPrompt";
import ImageGenerator from "@/components/ImageGenerator";
import ImageEditor from "@/components/ImageEditor";
import MiniatureFigurine from "@/components/MiniatureFigurine";
import AIChatbot from "@/components/AIChatbot";
import { Auth } from "@/components/Auth";
import { Sparkles, Wand2, Pencil, Images, LogOut, Languages, Package, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStateWithLocalStorage } from "@/hooks/useStateWithLocalStorage";

const Index = () => {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useStateWithLocalStorage("activeTab", "prompt");
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setShowAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success(t("toast.signedOut"));
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "fa" : "en");
  };

  return (
    <div className="min-h-screen relative">
      {/* Full-screen Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover"
      >
        <source src="/background-video-figurine.mp4" type="video/mp4" />
      </video>
      
      {/* No overlay - pure video visibility */}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-8 space-y-3 animate-fade-in-up">
          <div className="flex justify-end gap-2 mb-3">
            <Button onClick={toggleLanguage} variant="outline" size="sm" className="bg-card/20 neon-glow animate-pulse-glow">
              <Languages className="mr-1 h-3 w-3" />
              <span className="text-xs">{language === "en" ? "فارسی" : "English"}</span>
            </Button>
            {user ? (
              <>
                <Button onClick={() => navigate("/gallery")} variant="outline" size="sm" className="bg-card/20 neon-glow">
                  <Images className="mr-1 h-3 w-3" />
                  <span className="text-xs">{t("header.gallery")}</span>
                </Button>
                <Button onClick={handleSignOut} variant="outline" size="sm" className="bg-card/20 neon-glow">
                  <LogOut className="mr-1 h-3 w-3" />
                  <span className="text-xs">{t("header.signOut")}</span>
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowAuth(!showAuth)} variant="outline" size="sm" className="bg-card/20 neon-glow">
                <span className="text-xs">{t("header.signIn")}</span>
              </Button>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight animate-bounce-slow">
            <span className="gradient-text">{t("header.title")}</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            {t("header.subtitle")}
          </p>
        </header>

        {showAuth && !user && (
          <div className="mb-8">
            <Auth />
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-2 md:grid-cols-5 mb-6 bg-card/10 border border-border/50 neon-glow p-1">
            <TabsTrigger 
              value="prompt" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow-strong transition-all text-xs py-2"
            >
              <Wand2 className="mr-1 h-3 w-3" />
              <span className="hidden md:inline">{t("tabs.imageVideoToPrompt")}</span>
              <span className="md:hidden">Prompt</span>
            </TabsTrigger>
            <TabsTrigger 
              value="generate"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow-strong transition-all text-xs py-2"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              <span className="hidden md:inline">{t("tab.imageGenerator")}</span>
              <span className="md:hidden">Generate</span>
            </TabsTrigger>
            <TabsTrigger 
              value="edit"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow-strong transition-all text-xs py-2"
            >
              <Pencil className="mr-1 h-3 w-3" />
              <span className="hidden md:inline">{t("tab.imageEditor")}</span>
              <span className="md:hidden">Edit</span>
            </TabsTrigger>
            <TabsTrigger 
              value="miniature"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow-strong transition-all text-xs py-2"
            >
              <Package className="mr-1 h-3 w-3" />
              <span className="hidden md:inline">Miniature</span>
              <span className="md:hidden">Mini</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:neon-glow-strong transition-all text-xs py-2"
            >
              <MessageSquare className="mr-1 h-3 w-3" />
              <span className="hidden md:inline">AI Chat</span>
              <span className="md:hidden">Chat</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="mt-0">
            <ImageToPrompt />
          </TabsContent>

          <TabsContent value="generate" className="mt-0">
            <ImageGenerator />
          </TabsContent>

          <TabsContent value="edit" className="mt-0">
            <ImageEditor />
          </TabsContent>

          <TabsContent value="miniature" className="mt-0">
            <MiniatureFigurine />
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <AIChatbot />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <p>Powered by advanced AI models • Free and unlimited during beta</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
