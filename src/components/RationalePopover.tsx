import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";

export function RationalePopover({ text, label = "Por quê?" }: { text?: string | null; label?: string }) {
  if (!text) return null;
  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition shrink-0">
        <HelpCircle size={12} /> {label}
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-xs text-xs whitespace-pre-wrap">
        {text}
      </PopoverContent>
    </Popover>
  );
}