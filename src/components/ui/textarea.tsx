import * as React from "react";
import { Button } from "./button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  showCopy?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, showCopy = false, value, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
      if (value) {
        navigator.clipboard.writeText(value.toString());
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            showCopy && "pr-12",
            className,
          )}
          ref={ref}
          value={value}
          {...props}
        />
        {showCopy && value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 h-8 w-8 p-0"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
