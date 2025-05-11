
"use client";

import type { CLIOutput as CLIOutputType } from './types';
import { cn } from '@/lib/utils';

interface CLIOutputProps {
  output: CLIOutputType;
  prompt: string;
}

export function CLIOutput({ output, prompt }: CLIOutputProps) {
  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-words",
        output.type === 'error' && "text-destructive",
        output.type === 'output' && "text-foreground/90",
        output.type === 'system' && "text-muted-foreground italic"
      )}
    >
      {output.type === 'input' && <span className="text-primary">{prompt}</span>}
      {output.text}
    </div>
  );
}
