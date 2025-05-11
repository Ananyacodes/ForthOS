
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { KernelLogEntry } from './types';

interface KernelLogProps {
  logs: KernelLogEntry[];
}

export function KernelLogComponent({ logs }: KernelLogProps) {
  return (
    <Card className="flex flex-col h-full shadow-lg bg-card">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-lg text-accent">Forth Kernel Log</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-3">
          {logs.length === 0 && <p className="text-muted-foreground text-sm">No kernel messages yet.</p>}
          {logs.map((log) => (
            <div key={log.id} className="text-sm mb-1 whitespace-pre-wrap break-words">
              <span className="text-muted-foreground mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className="text-foreground/90">{log.message}</span>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
