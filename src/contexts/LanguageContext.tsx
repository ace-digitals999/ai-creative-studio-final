import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "fa";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translateToEnglish: (text: string) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    "header.title": "AI Creative Studio",
    "header.subtitle": "Transform your ideas into stunning visuals with cutting-edge AI technology",
    "header.signIn": "Sign In",
    "header.signOut": "Sign Out",
    "header.gallery": "Gallery",
    
    // Tabs
    "tab.imageToPrompt": "Image to Prompt",
    "tab.imageGenerator": "Image Generator",
    "tab.imageEditor": "Image Editor",
    "tab.adGenerator": "AI Ad Generator",
    
    // Common
    "common.generate": "Generate",
    "common.generating": "Generating...",
    "common.download": "Download",
    "common.save": "Save",
    "common.publish": "Publish",
    "common.copy": "Copy",
    "common.copied": "Copied!",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    
    // Image Generator
    "generator.simplePrompt": "Simple Prompt",
    "generator.simplePromptPlaceholder": "Simple idea: futuristic city, cute cat, epic landscape...",
    "generator.magicEnhance": "Magic Enhance Prompt",
    "generator.enhancing": "Enhancing...",
    "generator.enhancedPrompt": "Enhanced Prompt",
    "generator.style": "Style",
    "generator.aspectRatio": "Aspect Ratio",
    "generator.quality": "Quality",
    "generator.seed": "Seed",
    "generator.negativePrompt": "Negative Prompt",
    "generator.negativePromptPlaceholder": "What to avoid...",
    "generator.generateImage": "Generate Image",
    "generator.generatingImage": "Generating Image...",
    "generator.imagePreview": "Your generated image will appear here",
    
    // Styles
    "style.none": "None",
    "style.photorealistic": "Photorealistic",
    "style.anime": "Anime",
    "style.fantasy": "Fantasy",
    "style.vintage": "Vintage",
    "style.cinematic": "Cinematic",
    "style.abstract": "Abstract",
    "style.watercolor": "Watercolor",
    "style.oilPainting": "Oil Painting",
    
    // Aspect Ratios
    "ratio.square": "Square (1:1)",
    "ratio.landscape": "Landscape (16:9)",
    "ratio.portrait": "Portrait (9:16)",
    "ratio.standard": "Standard (4:3)",
    "ratio.photo": "Photo (3:2)",
    
    // Quality
    "quality.draft": "Draft (Fast)",
    "quality.medium": "Medium (Balanced)",
    "quality.high": "High (Detailed)",
    "quality.ultra": "Ultra (Maximum Quality)",
    
    // Image Editor
    "editor.uploadImage": "Upload Image",
    "editor.uploadPrompt": "Upload image to edit",
    "editor.uploadInfo": "PNG, JPG up to 10MB",
    "editor.editPrompt": "Simple idea: make it sunny, add flowers, change to night...",
    "editor.editImage": "Edit Image",
    "editor.editingImage": "Editing Image...",
    "editor.imagePreview": "Your edited image will appear here",
    
    // Image to Prompt
    "prompt.uploadImage": "Upload an image",
    "prompt.orDescribe": "Or describe your idea below",
    "prompt.description": "Simple description... e.g., cyberpunk city at night",
    "prompt.magicEnhance": "Magic Enhance Description",
    "prompt.mood": "Mood",
    "prompt.generatePrompts": "Generate Prompts",
    "prompt.generatingPrompts": "Generating Hyper-Detailed Prompts...",
    "prompt.generatedPrompts": "Generated Prompts",
    "prompt.mainPrompt": "Main Prompt",
    
    // Moods
    "mood.none": "None",
    "mood.serene": "Serene",
    "mood.energetic": "Energetic",
    "mood.ominous": "Ominous",
    "mood.whimsical": "Whimsical",
    "mood.melancholic": "Melancholic",
    
    // Auth
    "auth.signIn": "Sign In",
    "auth.signUp": "Sign Up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.signInButton": "Sign In",
    "auth.signUpButton": "Sign Up",
    "auth.switchToSignUp": "Don't have an account? Sign Up",
    "auth.switchToSignIn": "Already have an account? Sign In",
    
    // Gallery
    "gallery.title": "My Gallery",
    "gallery.allImages": "All Images",
    "gallery.myImages": "My Images",
    "gallery.publicImages": "Public Images",
    "gallery.makePublic": "Make Public",
    "gallery.makePrivate": "Make Private",
    "gallery.delete": "Delete",
    "gallery.noImages": "No images yet",
    "gallery.backToStudio": "Back to Studio",
    
    // Ad Generator
    "ad.title": "AI Ad Generator",
    "ad.uploadProduct": "Upload Product Image",
    "ad.uploadInfo": "PNG, JPG up to 10MB",
    "ad.productPrompt": "Product/Ad Description",
    "ad.productPromptPlaceholder": "Describe your product or ad idea: luxury watch, sports car, fashion brand...",
    "ad.magicEnhanceAd": "Magic Enhance Ad Prompt",
    "ad.enhancing": "Enhancing ad prompt...",
    "ad.enhancedPrompt": "Enhanced Ad Prompt",
    "ad.cinematicMode": "Cinematic Mode",
    "ad.hyperRealistic": "Hyper-Realistic",
    "ad.generateAd": "Generate Ad Image",
    "ad.generatingAd": "Creating Mesmerizing Ad...",
    "ad.imagePreview": "Your stunning ad will appear here",
    
    // Toast messages
    "toast.promptEnhanced": "Prompt enhanced!",
    "toast.imageGenerated": "Image generated successfully!",
    "toast.imageEdited": "Image edited successfully!",
    "toast.promptsGenerated": "Prompts generated successfully!",
    "toast.copiedToClipboard": "Copied to clipboard!",
    "toast.publishedToGallery": "Published to gallery!",
    "toast.savedToGallery": "Saved to your gallery",
    "toast.signedOut": "Signed out successfully",
    "toast.pleaseSignIn": "Please sign in to save images",
    "toast.enterPrompt": "Please enter a prompt first",
    "toast.provideInput": "Please provide an image or text description",
    "toast.adGenerated": "Ad image generated successfully!",
  },
  fa: {
    // Header
    "header.title": "استودیو خلاقیت هوش مصنوعی",
    "header.subtitle": "ایده‌های خود را با تکنولوژی پیشرفته هوش مصنوعی به تصاویر خیره‌کننده تبدیل کنید",
    "header.signIn": "ورود",
    "header.signOut": "خروج",
    "header.gallery": "گالری",
    
    // Tabs
    "tab.imageToPrompt": "تصویر به پرامپت",
    "tab.imageGenerator": "تولید تصویر",
    "tab.imageEditor": "ویرایش تصویر",
    "tab.adGenerator": "تولید تبلیغات هوش مصنوعی",
    
    // Common
    "common.generate": "تولید",
    "common.generating": "در حال تولید...",
    "common.download": "دانلود",
    "common.save": "ذخیره",
    "common.publish": "انتشار",
    "common.copy": "کپی",
    "common.copied": "کپی شد!",
    "common.loading": "در حال بارگذاری...",
    "common.error": "خطا",
    "common.success": "موفق",
    
    // Image Generator
    "generator.simplePrompt": "پرامپت ساده",
    "generator.simplePromptPlaceholder": "ایده ساده: شهر آینده‌نگر، گربه بامزه، چشم‌انداز حماسی...",
    "generator.magicEnhance": "بهبود جادویی پرامپت",
    "generator.enhancing": "در حال بهبود...",
    "generator.enhancedPrompt": "پرامپت بهبود یافته",
    "generator.style": "سبک",
    "generator.aspectRatio": "نسبت تصویر",
    "generator.quality": "کیفیت",
    "generator.seed": "سید",
    "generator.negativePrompt": "پرامپت منفی",
    "generator.negativePromptPlaceholder": "چیزهایی که باید اجتناب شود...",
    "generator.generateImage": "تولید تصویر",
    "generator.generatingImage": "در حال تولید تصویر...",
    "generator.imagePreview": "تصویر تولید شده شما اینجا نمایش داده می‌شود",
    
    // Styles
    "style.none": "هیچکدام",
    "style.photorealistic": "واقع‌گرایانه",
    "style.anime": "انیمه",
    "style.fantasy": "فانتزی",
    "style.vintage": "قدیمی",
    "style.cinematic": "سینمایی",
    "style.abstract": "انتزاعی",
    "style.watercolor": "آبرنگ",
    "style.oilPainting": "نقاشی رنگ روغن",
    
    // Aspect Ratios
    "ratio.square": "مربع (۱:۱)",
    "ratio.landscape": "افقی (۱۶:۹)",
    "ratio.portrait": "عمودی (۹:۱۶)",
    "ratio.standard": "استاندارد (۴:۳)",
    "ratio.photo": "عکس (۳:۲)",
    
    // Quality
    "quality.draft": "پیش‌نویس (سریع)",
    "quality.medium": "متوسط (متعادل)",
    "quality.high": "بالا (با جزئیات)",
    "quality.ultra": "فوق‌العاده (حداکثر کیفیت)",
    
    // Image Editor
    "editor.uploadImage": "آپلود تصویر",
    "editor.uploadPrompt": "تصویر را برای ویرایش آپلود کنید",
    "editor.uploadInfo": "PNG، JPG تا ۱۰ مگابایت",
    "editor.editPrompt": "ایده ساده: آفتابی کن، گل اضافه کن، به شب تبدیل کن...",
    "editor.editImage": "ویرایش تصویر",
    "editor.editingImage": "در حال ویرایش تصویر...",
    "editor.imagePreview": "تصویر ویرایش شده شما اینجا نمایش داده می‌شود",
    
    // Image to Prompt
    "prompt.uploadImage": "آپلود تصویر",
    "prompt.orDescribe": "یا ایده خود را در زیر توضیح دهید",
    "prompt.description": "توضیح ساده... مثلاً، شهر سایبرپانک در شب",
    "prompt.magicEnhance": "بهبود جادویی توضیحات",
    "prompt.mood": "حالت",
    "prompt.generatePrompts": "تولید پرامپت‌ها",
    "prompt.generatingPrompts": "در حال تولید پرامپت‌های فوق‌العاده دقیق...",
    "prompt.generatedPrompts": "پرامپت‌های تولید شده",
    "prompt.mainPrompt": "پرامپت اصلی",
    
    // Moods
    "mood.none": "هیچکدام",
    "mood.serene": "آرام",
    "mood.energetic": "پرانرژی",
    "mood.ominous": "شوم",
    "mood.whimsical": "عجیب و غریب",
    "mood.melancholic": "غمگین",
    
    // Auth
    "auth.signIn": "ورود",
    "auth.signUp": "ثبت نام",
    "auth.email": "ایمیل",
    "auth.password": "رمز عبور",
    "auth.signInButton": "ورود",
    "auth.signUpButton": "ثبت نام",
    "auth.switchToSignUp": "حساب کاربری ندارید؟ ثبت نام کنید",
    "auth.switchToSignIn": "قبلاً حساب کاربری دارید؟ وارد شوید",
    
    // Gallery
    "gallery.title": "گالری من",
    "gallery.allImages": "همه تصاویر",
    "gallery.myImages": "تصاویر من",
    "gallery.publicImages": "تصاویر عمومی",
    "gallery.makePublic": "عمومی کن",
    "gallery.makePrivate": "خصوصی کن",
    "gallery.delete": "حذف",
    "gallery.noImages": "هنوز تصویری وجود ندارد",
    "gallery.backToStudio": "بازگشت به استودیو",
    
    // Ad Generator
    "ad.title": "تولید تبلیغات با هوش مصنوعی",
    "ad.uploadProduct": "آپلود تصویر محصول",
    "ad.uploadInfo": "PNG، JPG تا ۱۰ مگابایت",
    "ad.productPrompt": "توضیحات محصول/تبلیغ",
    "ad.productPromptPlaceholder": "محصول یا ایده تبلیغاتی خود را توضیح دهید: ساعت لوکس، ماشین اسپرت، برند مد...",
    "ad.magicEnhanceAd": "بهبود جادویی پرامپت تبلیغاتی",
    "ad.enhancing": "در حال بهبود پرامپت تبلیغاتی...",
    "ad.enhancedPrompt": "پرامپت تبلیغاتی بهبود یافته",
    "ad.cinematicMode": "حالت سینمایی",
    "ad.hyperRealistic": "فوق‌واقع‌گرا",
    "ad.generateAd": "تولید تصویر تبلیغاتی",
    "ad.generatingAd": "در حال ساخت تبلیغ خیره‌کننده...",
    "ad.imagePreview": "تبلیغ خیره‌کننده شما اینجا نمایش داده می‌شود",
    
    // Toast messages
    "toast.promptEnhanced": "پرامپت بهبود یافت!",
    "toast.imageGenerated": "تصویر با موفقیت تولید شد!",
    "toast.imageEdited": "تصویر با موفقیت ویرایش شد!",
    "toast.promptsGenerated": "پرامپت‌ها با موفقیت تولید شدند!",
    "toast.copiedToClipboard": "در کلیپ‌بورد کپی شد!",
    "toast.publishedToGallery": "در گالری منتشر شد!",
    "toast.savedToGallery": "در گالری شما ذخیره شد",
    "toast.signedOut": "با موفقیت خارج شدید",
    "toast.pleaseSignIn": "لطفاً برای ذخیره تصاویر وارد شوید",
    "toast.enterPrompt": "لطفاً ابتدا یک پرامپت وارد کنید",
    "toast.provideInput": "لطفاً یک تصویر یا توضیحات متنی ارائه دهید",
    "toast.adGenerated": "تصویر تبلیغاتی با موفقیت تولید شد!",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "en";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const translateToEnglish = async (text: string): Promise<string> => {
    if (language === "en") return text;
    
    // Simple translation logic - in production, use a proper translation API
    // For now, just return the text as-is since the AI will handle it
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateToEnglish }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
