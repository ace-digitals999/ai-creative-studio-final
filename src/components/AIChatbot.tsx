import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Bot, User, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AIChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("google/gemini-2.5-flash");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: { 
          messages: [...messages, userMessage],
          model 
        },
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.message 
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error.message || "Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Chat cleared");
  };

  return (
    <div className="grid grid-cols-1 gap-8 max-w-5xl mx-auto">
      <Card className="p-6 bg-card/30 backdrop-blur-xl border-border/50 neon-glow space-y-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold gradient-text">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[220px] bg-card/50 border-border/50 neon-glow">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google/gemini-2.5-flash">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Gemini 2.5 Flash (Fast)
                  </div>
                </SelectItem>
                <SelectItem value="google/gemini-2.5-pro">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Gemini 2.5 Pro (Powerful)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearChat}
              disabled={messages.length === 0}
              className="neon-glow"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[500px] w-full rounded-md border border-border/50 p-4 bg-card/20">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <Bot className="h-16 w-16 text-primary animate-pulse" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Welcome to AI Assistant</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask me anything about image generation, creative projects, or get help with your ideas. 
                  I'm powered by advanced AI models and ready to assist!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg p-4 max-w-[80%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground neon-glow"
                        : "bg-card/50 border border-border/50"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-secondary" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <div className="bg-card/50 border border-border/50 rounded-lg p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="min-h-[60px] bg-card/50 border-border/50 focus:border-primary resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 neon-glow-strong"
            size="lg"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Powered by free Gemini models • Ask questions, get creative suggestions, or discuss your projects
        </p>
      </Card>
    </div>
  );
}
