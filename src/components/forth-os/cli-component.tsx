
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CLIOutput as CLIOutputType } from './types';
import { CLIOutput } from './cli-output';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CLIComponentProps {
  history: CLIOutputType[];
  onCommand: (command: string) => void;
  currentPath: string;
  isBooting: boolean;
}

export function CLIComponent({ history, onCommand, currentPath, isBooting }: CLIComponentProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isBooting) {
      onCommand(inputValue.trim());
      setInputValue('');
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  }, [history]);
  
  useEffect(() => {
    if (!isBooting && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isBooting]);

  const promptText = `ForthOS:${currentPath === '/' ? '' : currentPath}> `;

  return (
    <Card className="flex flex-col flex-1 h-full shadow-lg bg-card">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-lg text-primary">MicroPython Userland (CLI)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
          {history.map((item) => (
            <CLIOutput key={item.id} output={item} prompt={promptText} />
          ))}
           {isBooting && <div className="text-muted-foreground">System booting, please wait...</div>}
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex items-center p-3 border-t">
          <span className="text-primary mr-2 select-none">{promptText}</span>
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={`flex-1 bg-transparent border-none focus:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 p-0 h-auto text-base ${!isBooting ? 'blinking-cursor' : ''}`}
            placeholder=""
            spellCheck="false"
            autoComplete="off"
            disabled={isBooting}
          />
        </form>
      </CardContent>
    </Card>
  );
}
