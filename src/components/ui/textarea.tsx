import * as React from "react";
import { Button } from "./button";
import { Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  showCopy?: boolean;
  showClear?: boolean;
  onClear?: () => void;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, showCopy = false, showClear = false, value, onClear, onChange, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
      if (value) {
        navigator.clipboard.writeText(value.toString());
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      }
    };

    const handleClear = () => {
      if (onClear) {
        onClear();
      } else if (onChange) {
        // If onClear is not provided but onChange is, create a synthetic event
        const syntheticEvent = {
          target: { value: "" },
          currentTarget: { value: "" },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
      toast.success("Cleared!");
    };

    const showButtons = (showCopy || showClear) && value;
    const buttonCount = (showCopy && value ? 1 : 0) + (showClear && value ? 1 : 0);

    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            showButtons && buttonCount === 1 && "pr-12",
            showButtons && buttonCount === 2 && "pr-20",
            className,
          )}
          ref={ref}
          value={value}
          onChange={onChange}
          {...props}
        />
        {showButtons && (
          <div className="absolute top-2 right-2 flex gap-1">
            {showClear && value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {showCopy && value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
