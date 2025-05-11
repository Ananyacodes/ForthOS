
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MemoryBlock } from './types';
import { TOTAL_MEMORY_SIZE } from './types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MemoryVisualizerProps {
  memoryBlocks: MemoryBlock[];
}

const getBlockColor = (status: MemoryBlock['status']): string => {
  switch (status) {
    case 'kernel':
      return 'bg-red-600'; // Distinct color for kernel
    case 'micropython_vm':
      return 'bg-blue-600'; // Distinct color for VM
    case 'process':
      return 'bg-green-600'; // Theme's primary or a distinct green for running processes
    case 'user_allocated':
      return 'bg-yellow-600'; // Different color for general user allocations not tied to a process
    case 'free':
      return 'bg-muted'; // Muted, from theme (e.g., gray)
    default:
      return 'bg-gray-500';
  }
};

export function MemoryVisualizerComponent({ memoryBlocks }: MemoryVisualizerProps) {
  return (
    <Card className="flex flex-col h-full shadow-lg bg-card">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-lg text-accent">Memory Management</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="text-sm text-muted-foreground mb-2">Total Memory: {TOTAL_MEMORY_SIZE} units</div>
          <div className="space-y-1">
            {memoryBlocks.map((block) => (
              <div 
                key={block.id} 
                className="flex items-center text-xs p-1.5 rounded-sm border border-border/50" 
                title={`ID: ${block.id}, Addr: ${block.address}, Size: ${block.size}, Status: ${block.status}${block.label ? `, Label: ${block.label}` : ''}${block.pid ? `, PID: ${block.pid}` : ''}`}
              >
                <div className={cn("h-4 w-4 rounded-sm mr-2 shrink-0", getBlockColor(block.status))}></div>
                <div className="truncate">
                  <span className="font-semibold">{block.id.substring(0,12)}...</span> ({block.address}-{block.address + block.size - 1}): {block.size}u - <span className="capitalize">{block.status.replace(/_/g, ' ')}</span> {block.label && `(${block.label})`} {block.pid && `(PID: ${block.pid})`}
                </div>
              </div>
            ))}
            {memoryBlocks.length === 0 && <p className="text-sm text-muted-foreground">Memory map is empty.</p>}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
