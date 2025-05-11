"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { CLIComponent } from '@/components/forth-os/cli-component';
import { KernelLogComponent } from '@/components/forth-os/kernel-log-component';
import { MemoryVisualizerComponent } from '@/components/forth-os/memory-visualizer-component';
import type { CLIOutput, KernelLogEntry, MemoryBlock } from '@/components/forth-os/types';
import { TOTAL_MEMORY_SIZE, KERNEL_MEMORY_SIZE, MICROPYTHON_VM_MEMORY_SIZE } from '@/components/forth-os/types';
import { useToast } from '@/hooks/use-toast';

// Helper to generate unique IDs
let idCounter = 0;
const uniqueId = (prefix: string = '') => `${prefix}${++idCounter}`;

export default function ForthOSPage() {
  const { toast } = useToast();
  const [cliHistory, setCliHistory] = useState<CLIOutput[]>([]);
  const [kernelLogs, setKernelLogs] = useState<KernelLogEntry[]>([]);
  const [memoryMap, setMemoryMap] = useState<MemoryBlock[]>([]);
  const [nextMemoryAddress, setNextMemoryAddress] = useState(0);

  const addKernelLog = useCallback((message: string) => {
    setKernelLogs(prev => [...prev, { 
      id: uniqueId('log-'), 
      timestamp: new Date().toLocaleTimeString(), 
      message 
    }].slice(-100)); // Keep last 100 logs
  }, []);

  const addCliOutput = useCallback((text: string, type: CLIOutput['type'] = 'output') => {
    setCliHistory(prev => [...prev, { id: uniqueId('cli-'), type, text }].slice(-200)); // Keep last 200 cli entries
  }, []);


  // Initialize Memory
  useEffect(() => {
    addKernelLog("ForthOS Kernel Initializing...");
    const initialMemory: MemoryBlock[] = [];
    let currentAddress = 0;

    // Kernel
    initialMemory.push({
      id: uniqueId('mem_kernel_'),
      address: currentAddress,
      size: KERNEL_MEMORY_SIZE,
      status: 'kernel',
      label: 'Forth Kernel',
    });
    currentAddress += KERNEL_MEMORY_SIZE;

    // MicroPython VM
    initialMemory.push({
      id: uniqueId('mem_vm_'),
      address: currentAddress,
      size: MICROPYTHON_VM_MEMORY_SIZE,
      status: 'micropython_vm',
      label: 'MicroPython VM',
    });
    currentAddress += MICROPYTHON_VM_MEMORY_SIZE;
    
    setNextMemoryAddress(currentAddress); // Set starting point for dynamic allocations

    // Initial Free Block
    if (currentAddress < TOTAL_MEMORY_SIZE) {
      initialMemory.push({
        id: uniqueId('mem_free_'),
        address: currentAddress,
        size: TOTAL_MEMORY_SIZE - currentAddress,
        status: 'free',
      });
    }
    
    setMemoryMap(initialMemory);
    addKernelLog("Memory Manager Initialized.");
    addKernelLog(`Total Memory: ${TOTAL_MEMORY_SIZE} units. Kernel: ${KERNEL_MEMORY_SIZE}, VM: ${MICROPYTHON_VM_MEMORY_SIZE}.`);
    addKernelLog("MicroPython Userland Ready.");
    addCliOutput("Welcome to ForthOS! Type 'help' for available commands.");
  }, [addKernelLog, addCliOutput]);


  const handleCommand = (command: string) => {
    addCliOutput(command, 'input');
    const [cmd, ...args] = command.toLowerCase().split(' ');

    switch (cmd) {
      case 'help':
        addCliOutput(
          "Available commands:\n" +
          "  help                  - Show this help message\n" +
          "  echo [text]           - Print text to console\n" +
          "  clear                 - Clear CLI output\n" +
          "  kernel_log            - (System) Show recent kernel messages (also visible in panel)\n" +
          "  mem_map               - (System) Show current memory map\n" +
          "  mem_alloc <size>      - (System Call) Allocate memory\n" +
          "  mem_free <id>         - (System Call) Free allocated memory block\n" +
          "  ps                    - (Userland) List 'running processes'\n" +
          "  run <script.py>       - (Userland) Simulate running a MicroPython script"
        );
        break;
      case 'echo':
        addCliOutput(args.join(' '));
        break;
      case 'clear':
        setCliHistory([]);
        break;
      case 'kernel_log':
        addKernelLog("User requested kernel log display.");
        kernelLogs.forEach(log => addCliOutput(`[${log.timestamp}] ${log.message}`, 'output'));
        break;
      case 'mem_map':
        addKernelLog("User requested memory map display.");
        addCliOutput("Current Memory Map:");
        memoryMap.forEach(block => {
          addCliOutput(`  ID: ${block.id}, Addr: ${block.address}, Size: ${block.size}, Status: ${block.status}${block.label ? `, Label: ${block.label}`: ''}`);
        });
        break;
      case 'mem_alloc':
        const sizeToAlloc = parseInt(args[0]);
        if (isNaN(sizeToAlloc) || sizeToAlloc <= 0) {
          addCliOutput("Error: Invalid size for mem_alloc.", 'error');
          addKernelLog("Failed mem_alloc: Invalid size.");
          break;
        }
        addKernelLog(`System Call: mem_alloc request for ${sizeToAlloc} units.`);
        
        // Simple allocation: find first free block that fits or split it
        let allocated = false;
        const newMemoryMap = [...memoryMap];
        const freeBlockIndex = newMemoryMap.findIndex(b => b.status === 'free' && b.size >= sizeToAlloc);

        if (freeBlockIndex !== -1) {
          const blockToSplit = newMemoryMap[freeBlockIndex];
          const newBlockId = uniqueId('mem_user_');
          const newAllocatedBlock: MemoryBlock = {
            id: newBlockId,
            address: blockToSplit.address,
            size: sizeToAlloc,
            status: 'user_allocated',
            label: `User Process ${newBlockId.slice(-2)}`
          };

          newMemoryMap.splice(freeBlockIndex, 1, newAllocatedBlock); // Replace or insert allocated part
          
          if (blockToSplit.size > sizeToAlloc) { // If there's remaining space, create a new free block
            const remainingFreeBlock: MemoryBlock = {
              id: uniqueId('mem_free_'),
              address: blockToSplit.address + sizeToAlloc,
              size: blockToSplit.size - sizeToAlloc,
              status: 'free',
            };
            newMemoryMap.splice(freeBlockIndex + 1, 0, remainingFreeBlock);
          }
          
          setMemoryMap(newMemoryMap);
          addCliOutput(`Memory allocated. Block ID: ${newBlockId}, Size: ${sizeToAlloc}`);
          addKernelLog(`mem_alloc successful. Block ${newBlockId} allocated ${sizeToAlloc} units at address ${newAllocatedBlock.address}.`);
          allocated = true;
        }

        if (!allocated) {
          addCliOutput("Error: Not enough contiguous free memory.", 'error');
          addKernelLog("mem_alloc failed: Out of memory or fragmentation.");
        }
        break;
      case 'mem_free':
        const blockIdToFree = args[0];
        if (!blockIdToFree) {
          addCliOutput("Error: Missing block ID for mem_free.", 'error');
          addKernelLog("Failed mem_free: Missing block ID.");
          break;
        }
        addKernelLog(`System Call: mem_free request for block ID ${blockIdToFree}.`);
        
        let freed = false;
        const updatedMemoryMap = memoryMap.map(block => {
          if (block.id === blockIdToFree && block.status === 'user_allocated') {
            freed = true;
            addKernelLog(`Block ${blockIdToFree} freed. Size: ${block.size} at address ${block.address}.`);
            return { ...block, status: 'free', label: undefined };
          }
          return block;
        });

        // Basic coalescing: merge adjacent free blocks
        const coalescedMap: MemoryBlock[] = [];
        let i = 0;
        while (i < updatedMemoryMap.length) {
            let currentBlock = updatedMemoryMap[i];
            if (currentBlock.status === 'free') {
                let j = i + 1;
                while (j < updatedMemoryMap.length && updatedMemoryMap[j].status === 'free' && updatedMemoryMap[j].address === currentBlock.address + currentBlock.size) {
                    currentBlock.size += updatedMemoryMap[j].size;
                    // Potentially update ID or keep first one
                    currentBlock.id = uniqueId('mem_free_coalesced_'); 
                    j++;
                }
                i = j -1; // adjust index
            }
            coalescedMap.push(currentBlock);
            i++;
        }


        if (freed) {
          setMemoryMap(coalescedMap);
          addCliOutput(`Memory block ${blockIdToFree} freed.`);
        } else {
          addCliOutput(`Error: Block ID ${blockIdToFree} not found or not user-allocated.`, 'error');
          addKernelLog(`mem_free failed: Block ${blockIdToFree} invalid.`);
        }
        break;
      case 'ps':
        addKernelLog("Userland 'ps' command executed.");
        addCliOutput("PID\tTTY\tTIME\tCMD\n" +
                     "1\ttty1\t00:00:01\t[kernel_task]\n" +
                     "10\ttty1\t00:00:03\tmicropython_vm\n" +
                     "15\ttty1\t00:00:00\tsh (CLI)");
        break;
      case 'run':
        const scriptName = args[0];
        if (!scriptName) {
          addCliOutput("Error: Missing script name for 'run'. Usage: run <script.py>", 'error');
          break;
        }
        addKernelLog(`Userland attempting to run script: ${scriptName}`);
        if (scriptName === 'hello.py') {
          addCliOutput(`Running ${scriptName}...`);
          addCliOutput("Hello from MicroPython in ForthOS!");
        } else if (scriptName === 'test_mem.py') {
          addCliOutput(`Running ${scriptName}...`);
          addCliOutput("Attempting to allocate 10 units...");
          handleCommand("mem_alloc 10"); // Simulate script action
        } else {
          addCliOutput(`Error: Script '${scriptName}' not found.`, 'error');
        }
        break;
      default:
        addCliOutput(`Error: Command not found: ${cmd}`, 'error');
        addKernelLog(`Unknown command received: ${cmd}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-mono">
      <header className="p-2 border-b border-border text-center shadow-sm">
        <h1 className="text-xl font-semibold text-primary">ForthOS v0.1</h1>
      </header>
      <main className="flex flex-1 flex-col md:flex-row gap-4 p-4 overflow-hidden">
        <div className="flex-grow-[3] basis-2/3 min-h-0"> {/* Ensure flex item can shrink */}
          <CLIComponent history={cliHistory} onCommand={handleCommand} />
        </div>
        <div className="flex-grow-[1] basis-1/3 flex flex-col gap-4 min-h-0"> {/* Ensure flex item can shrink */}
          <div className="flex-1 min-h-0"> {/* Kernel log takes available space */}
            <KernelLogComponent logs={kernelLogs} />
          </div>
          <div className="flex-1 min-h-0"> {/* Memory visualizer takes available space */}
            <MemoryVisualizerComponent memoryBlocks={memoryMap} />
          </div>
        </div>
      </main>
    </div>
  );
}
