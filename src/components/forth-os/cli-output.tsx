"use client";

import type { CLIOutput as CLIOutputType } from './types';
import { cn } from '@/lib/utils';

interface CLIOutputProps {
  output: CLIOutputType;
}

export function CLIOutput({ output }: CLIOutputProps) {
  const prompt = "ForthOS> ";

  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-words",
        output.type === 'error' && "text-destructive",
        output.type === 'output' && "text-foreground/90" 
      )}
    >
      {output.type === 'input' && <span className="text-primary">{prompt}</span>}
      {output.text}
    </div>
  );
}
