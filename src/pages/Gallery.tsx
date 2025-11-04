import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Globe, Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type GalleryImage = {
  id: string;
  image_url: string;
  prompt: string;
  style: string | null;
  is_public: boolean;
  created_at: string;
};

export default function Gallery() {
  const [myImages, setMyImages] = useState<GalleryImage[]>([]);
  const [publicImages, setPublicImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: myImagesData } = await supabase
        .from("gallery_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setMyImages(myImagesData || []);
    }

    const { data: publicImagesData } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    setPublicImages(publicImagesData || []);
    setLoading(false);
  };

  const togglePublic = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("gallery_images")
      .update({ is_public: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Success", 
        description: currentStatus ? "Image made private" : "Image published to gallery!" 
      });
      fetchImages();
    }
  };

  const deleteImage = async (id: string) => {
    const { error } = await supabase
      .from("gallery_images")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Image deleted" });
      fetchImages();
    }
  };

  const ImageCard = ({ image, showActions }: { image: GalleryImage; showActions: boolean }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <img 
          src={image.image_url} 
          alt={image.prompt} 
          className="w-full h-64 object-cover"
        />
        <div className="p-4 space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-2">{image.prompt}</p>
          {image.style && (
            <p className="text-xs text-muted-foreground">Style: {image.style}</p>
          )}
          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => togglePublic(image.id, image.is_public)}
                className="flex-1"
              >
                {image.is_public ? (
                  <><Lock className="w-4 h-4 mr-2" /> Make Private</>
                ) : (
                  <><Globe className="w-4 h-4 mr-2" /> Publish</>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteImage(image.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="p-8 text-center">Loading gallery...</div>;
  }

  return (
    <div className="min-h-screen animated-gradient-bg">
      <div className="container mx-auto p-8">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate("/")} variant="outline" className="neon-glow">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Studio
          </Button>
          <h1 className="text-4xl font-bold gradient-text">Gallery</h1>
        </div>
        
        <Tabs defaultValue="my-images">
          <TabsList>
            <TabsTrigger value="my-images">My Images ({myImages.length})</TabsTrigger>
            <TabsTrigger value="public">Public Gallery ({publicImages.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-images" className="mt-6">
            {myImages.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                No images yet. Generate some images and save them to your gallery!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myImages.map((image) => (
                  <ImageCard key={image.id} image={image} showActions={true} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="public" className="mt-6">
            {publicImages.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                No public images yet. Be the first to share your creations!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicImages.map((image) => (
                  <ImageCard key={image.id} image={image} showActions={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
