
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CLIComponent } from '@/components/forth-os/cli-component';
import { KernelLogComponent } from '@/components/forth-os/kernel-log-component';
import { MemoryVisualizerComponent } from '@/components/forth-os/memory-visualizer-component';
import type { CLIOutput, KernelLogEntry, MemoryBlock, Process, FileSystemNode, FileSystemTree } from '@/components/forth-os/types';
import { TOTAL_MEMORY_SIZE, KERNEL_MEMORY_SIZE, MICROPYTHON_VM_MEMORY_SIZE, DEFAULT_USER_PROCESS_MEMORY } from '@/components/forth-os/types';
import { useToast } from '@/hooks/use-toast';

let idCounter = 0;
const uniqueId = (prefix: string = '') => `${prefix}${++idCounter}`;

const initialFilesystem: FileSystemTree = {
  '/': { 
    id: '/', 
    name: '/', 
    type: 'directory', 
    parentId: null, 
    lastModified: new Date().toISOString(),
    children: {
      'home': { 
        id: '/home', 
        name: 'home', 
        type: 'directory',
        parentId: '/', 
        lastModified: new Date().toISOString(),
        children: {
          'user': { 
            id: '/home/user', 
            name: 'user', 
            type: 'directory', 
            parentId: '/home', 
            lastModified: new Date().toISOString(),
            children: {} 
          }
        }
      },
      'bin': { 
        id: '/bin', 
        name: 'bin', 
        type: 'directory', 
        parentId: '/', 
        lastModified: new Date().toISOString(),
        children: {
          'hello.py': { id: '/bin/hello.py', name: 'hello.py', type: 'file', parentId: '/bin', content: 'print("Hello from MicroPython in ForthOS!")', lastModified: new Date().toISOString() },
          'test_mem.py': { id: '/bin/test_mem.py', name: 'test_mem.py', type: 'file', parentId: '/bin', content: '# Simulates memory allocation request\n# This script will attempt to allocate memory.\nprint("Requesting 10 units of memory via system call...")', lastModified: new Date().toISOString() },
          'blink.py': { id: '/bin/blink.py', name: 'blink.py', type: 'file', parentId: '/bin', content: '# Simulates LED blinking\nprint("Starting LED blink sequence...")', lastModified: new Date().toISOString() },
          'iot_sensor.py': { id: '/bin/iot_sensor.py', name: 'iot_sensor.py', type: 'file', parentId: '/bin', content: '# Simulates reading from an IoT sensor\nprint("Reading sensor data...")', lastModified: new Date().toISOString() }
        }
      },
      'motd': { id: '/motd', name: 'motd', type: 'file', parentId: '/', content: 'Welcome to ForthOS v0.1 - The Future is Retro!', lastModified: new Date().toISOString() }
    }
  }
};


export default function ForthOSPage() {
  const { toast } = useToast();
  const [cliHistory, setCliHistory] = useState<CLIOutput[]>([]);
  const [kernelLogs, setKernelLogs] = useState<KernelLogEntry[]>([]);
  const [memoryMap, setMemoryMap] = useState<MemoryBlock[]>([]);
  
  const [isBooting, setIsBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);

  const [filesystem, setFilesystem] = useState<FileSystemTree>(initialFilesystem);
  const [currentPath, setCurrentPath] = useState<string>('/');

  const [processes, setProcesses] = useState<Process[]>([]);
  const [nextPid, setNextPid] = useState(1); // Start PIDs at 1
  const simulationIntervals = useRef<Record<number, NodeJS.Timeout>>({});


  const addKernelLog = useCallback((message: string) => {
    setKernelLogs(prev => [...prev, { 
      id: uniqueId('log-'), 
      timestamp: new Date().toISOString(), 
      message 
    }].slice(-100));
  }, []);

  const addCliOutput = useCallback((text: string, type: CLIOutput['type'] = 'output') => {
    setCliHistory(prev => [...prev, { id: uniqueId('cli-'), type, text }].slice(-200));
  }, []);

  // Path Utilities
  const normalizePath = (path: string): string => {
    if (!path) return '/';
    const parts = path.split('/').filter(p => p);
    let newPath = '/' + parts.join('/');
    if (newPath === '//') newPath = '/';
    return newPath;
  };

  const resolvePath = (targetPath: string): string => {
    if (targetPath.startsWith('/')) return normalizePath(targetPath);
    const parts = currentPath.split('/').filter(p => p);
    targetPath.split('/').forEach(part => {
      if (part === '..') parts.pop();
      else if (part !== '.') parts.push(part);
    });
    return normalizePath('/' + parts.join('/'));
  };

  const getNodeByPath = (path: string): FileSystemNode | null => {
    const normalizedPath = normalizePath(path);
    if (normalizedPath === '/') return filesystem['/'];
    
    const parts = normalizedPath.split('/').filter(p => p);
    let currentNode: FileSystemNode | undefined = filesystem['/'];

    for (const part of parts) {
      if (currentNode && currentNode.type === 'directory' && currentNode.children && currentNode.children[part]) {
        currentNode = currentNode.children[part];
      } else {
        return null;
      }
    }
    return currentNode || null;
  };
  
  // Boot Sequence & OS Initialization
  useEffect(() => {
    const bootSteps = [
      { delay: 200, message: "ForthOS v0.1 Bootloader...", progress: 10 },
      { delay: 300, message: "Initializing memory controller...", progress: 20, kernelLog: "Memory Controller online." },
      { delay: 200, message: "Scanning memory banks... [OK]", progress: 30 },
      { delay: 400, message: "Loading Forth Kernel (v0.1.0)...", progress: 50, kernelLog: "Kernel loading..." },
      { delay: 150, message: "  Core functions [||||||||||]", progress: 55 },
      { delay: 150, message: "  System call interface [||||||||||]", progress: 60 },
      { delay: 300, message: "Kernel loaded successfully.", progress: 70, kernelLog: "Kernel bootstrap complete." },
      { delay: 400, message: "Starting MicroPython Userland (v1.18)...", progress: 80, kernelLog: "MicroPython VM starting..." },
      { delay: 200, message: "  Allocating VM memory... [OK]", progress: 85 },
      { delay: 200, message: "  Initializing interpreter... [OK]", progress: 90 },
      { delay: 300, message: "MicroPython ready.", progress: 95, kernelLog: "MicroPython VM started." },
      { delay: 200, message: "Boot sequence complete.", progress: 100 },
    ];

    let cumulativeDelay = 0;
    const timeouts: NodeJS.Timeout[] = [];

    addCliOutput(" ", "system"); // Initial empty line for boot sequence

    bootSteps.forEach(step => {
      cumulativeDelay += step.delay;
      const timeoutId = setTimeout(() => {
        addCliOutput(step.message, 'system');
        setBootProgress(step.progress);
        if (step.kernelLog) addKernelLog(step.kernelLog);
      }, cumulativeDelay);
      timeouts.push(timeoutId);
    });

    const totalBootTime = cumulativeDelay + 300;
    const finalTimeout = setTimeout(() => {
      setIsBooting(false);
    }, totalBootTime);
    timeouts.push(finalTimeout);
    
    return () => timeouts.forEach(clearTimeout);
  }, [addCliOutput, addKernelLog]);


  useEffect(() => {
    if (isBooting) return;

    addKernelLog("ForthOS System Initializing post-boot...");
    const initialMemory: MemoryBlock[] = [];
    let currentAddress = 0;

    initialMemory.push({ id: uniqueId('mem_kernel_'), address: currentAddress, size: KERNEL_MEMORY_SIZE, status: 'kernel', label: 'Forth Kernel' });
    currentAddress += KERNEL_MEMORY_SIZE;

    initialMemory.push({ id: uniqueId('mem_vm_'), address: currentAddress, size: MICROPYTHON_VM_MEMORY_SIZE, status: 'micropython_vm', label: 'MicroPython VM' });
    currentAddress += MICROPYTHON_VM_MEMORY_SIZE;
    
    if (currentAddress < TOTAL_MEMORY_SIZE) {
      initialMemory.push({ id: uniqueId('mem_free_'), address: currentAddress, size: TOTAL_MEMORY_SIZE - currentAddress, status: 'free' });
    }
    setMemoryMap(initialMemory);
    addKernelLog("Memory Manager Initialized.");
    addKernelLog(`Total Memory: ${TOTAL_MEMORY_SIZE} units. Kernel: ${KERNEL_MEMORY_SIZE}, VM: ${MICROPYTHON_VM_MEMORY_SIZE}.`);

    const now = new Date().toISOString();
    const initialProcesses: Process[] = [
      { pid: nextPid, command: '[kernel_task]', status: 'running', priority: 0, startTime: now, user: 'root', memoryFootprint: KERNEL_MEMORY_SIZE },
      { pid: nextPid + 1, command: 'micropython_vm', status: 'running', priority: 10, startTime: now, user: 'root', memoryFootprint: MICROPYTHON_VM_MEMORY_SIZE },
      { pid: nextPid + 2, command: 'sh (CLI)', status: 'running', priority: 10, startTime: now, user: 'user' },
    ];
    setProcesses(initialProcesses);
    setNextPid(nextPid + 3);
    addKernelLog("Process Manager Initialized. Essential processes started.");
    
    setFilesystem(initialFilesystem); // Already initialized, but ensure it's set
    setCurrentPath('/home/user'); // Start user in their home directory
    addKernelLog("Filesystem initialized. Current path: /home/user");

    addKernelLog("MicroPython Userland Ready.");
    const motdNode = getNodeByPath('/motd');
    if (motdNode && motdNode.type === 'file' && motdNode.content) {
        addCliOutput(motdNode.content);
    }
    addCliOutput(`Type 'help' for available commands. Current directory: ${currentPath}`);
  }, [isBooting, addKernelLog, addCliOutput]); // removed nextPid from deps to avoid re-init on pid change.

  // Helper for memory allocation
  const allocateMemoryForProcess = (pid: number, requestedSize: number, label: string): boolean => {
    const sizeToAlloc = requestedSize > 0 ? requestedSize : DEFAULT_USER_PROCESS_MEMORY;
    addKernelLog(`Process ${pid} requesting ${sizeToAlloc} units of memory for ${label}.`);

    const freeBlockIndex = memoryMap.findIndex(b => b.status === 'free' && b.size >= sizeToAlloc);
    if (freeBlockIndex === -1) {
      addKernelLog(`Memory allocation failed for PID ${pid}: Not enough contiguous free memory.`);
      addCliOutput(`Error: Not enough memory to start ${label}.`, 'error');
      return false;
    }

    const newMemoryMap = [...memoryMap];
    const blockToSplit = newMemoryMap[freeBlockIndex];
    const newAllocatedBlock: MemoryBlock = {
      id: uniqueId(`mem_proc_${pid}_`),
      address: blockToSplit.address,
      size: sizeToAlloc,
      status: 'process',
      label: `Process ${pid} (${label})`,
      pid: pid,
    };

    newMemoryMap.splice(freeBlockIndex, 1, newAllocatedBlock);
    if (blockToSplit.size > sizeToAlloc) {
      newMemoryMap.splice(freeBlockIndex + 1, 0, {
        id: uniqueId('mem_free_'),
        address: blockToSplit.address + sizeToAlloc,
        size: blockToSplit.size - sizeToAlloc,
        status: 'free',
      });
    }
    setMemoryMap(newMemoryMap);
    addKernelLog(`Memory allocated for PID ${pid} at ${newAllocatedBlock.address}, size ${sizeToAlloc}.`);
    setProcesses(prev => prev.map(p => p.pid === pid ? {...p, memoryFootprint: sizeToAlloc} : p));
    return true;
  };

  const freeMemoryForProcess = (pid: number) => {
    addKernelLog(`Freeing memory for PID ${pid}.`);
    let freed = false;
    const updatedMemoryMap = memoryMap.map(block => {
      if (block.pid === pid && (block.status === 'process' || block.status === 'user_allocated')) {
        freed = true;
        return { ...block, status: 'free' as 'free', label: undefined, pid: undefined };
      }
      return block;
    });

    if (!freed) {
      addKernelLog(`No memory found allocated for PID ${pid}.`);
      return;
    }
    
    // Coalesce free blocks
    const coalescedMap: MemoryBlock[] = [];
    let i = 0;
    updatedMemoryMap.sort((a,b) => a.address - b.address); // Ensure sorted by address for coalescing
    while (i < updatedMemoryMap.length) {
        let currentBlock = {...updatedMemoryMap[i]}; // clone
        if (currentBlock.status === 'free') {
            let j = i + 1;
            while (j < updatedMemoryMap.length && updatedMemoryMap[j].status === 'free' && updatedMemoryMap[j].address === currentBlock.address + currentBlock.size) {
                currentBlock.size += updatedMemoryMap[j].size;
                currentBlock.id = uniqueId('mem_free_coalesced_'); 
                j++;
            }
            i = j -1; 
        }
        coalescedMap.push(currentBlock);
        i++;
    }
    setMemoryMap(coalescedMap);
    addKernelLog(`Memory for PID ${pid} freed and coalesced.`);
  };


  const handleCommand = (command: string) => {
    if (isBooting) {
      addCliOutput("System is booting. Please wait...", 'error');
      return;
    }
    addCliOutput(command, 'input');
    const [cmd, ...args] = command.trim().split(' ');
    const cmdLower = cmd.toLowerCase();

    switch (cmdLower) {
      case 'help':
        addCliOutput(
          "Available commands:\n" +
          "  help                      - Show this help message\n" +
          "  echo [text]               - Print text to console\n" +
          "  clear                     - Clear CLI output\n" +
          "  kernel_log                - (System) Show recent kernel messages\n" +
          "  mem_map                   - (System) Show current memory map\n" +
          "  mem_alloc <size> [<label>] - (System Call) Allocate memory\n" +
          "  mem_free <id_or_pid>      - (System Call) Free memory block by ID or PID\n" +
          "  ls [path]                 - List directory contents\n" +
          "  cat <filepath>            - Display file content\n" +
          "  touch <filepath>          - Create an empty file or update timestamp\n" +
          "  mkdir <dirpath>           - Create a directory\n" +
          "  cd <path>                 - Change current directory\n" +
          "  pwd                       - Print working directory\n" +
          "  ps                        - List running processes\n" +
          "  kill <pid>                - Terminate a process\n" +
          "  nice <pid> <priority>     - Change process priority (0-19, lower is higher)\n" +
          "  run <script.py> [args...] - Simulate running a MicroPython script"
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
        if (kernelLogs.length === 0) addCliOutput("No kernel logs yet.");
        kernelLogs.forEach(log => addCliOutput(`[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`, 'system'));
        break;
      case 'mem_map':
        addKernelLog("User requested memory map display.");
        addCliOutput("Current Memory Map:");
        memoryMap.forEach(block => {
          addCliOutput(`  ID: ${block.id}, Addr: ${block.address}, Size: ${block.size}, Status: ${block.status}${block.label ? `, Label: ${block.label}`: ''}${block.pid ? `, PID: ${block.pid}`: ''}`);
        });
        break;
      case 'mem_alloc':
        const sizeToAlloc = parseInt(args[0]);
        const label = args.length > 1 ? args.slice(1).join(' ') : `User Allocation ${uniqueId()}`;
        if (isNaN(sizeToAlloc) || sizeToAlloc <= 0) {
          addCliOutput("Error: Invalid size for mem_alloc.", 'error');
          addKernelLog("Failed mem_alloc: Invalid size.");
          break;
        }
        addKernelLog(`System Call: mem_alloc request for ${sizeToAlloc} units for '${label}'.`);
        
        const tempPidForAlloc = nextPid; // Use a temporary PID conceptually for this allocation
        setNextPid(prev => prev + 1); 
        const allocated = allocateMemoryForProcess(tempPidForAlloc, sizeToAlloc, label);
        if (allocated) {
           // For user_alloc, we don't add to process list, just mark memory.
           // Find the allocated block and report its ID.
           const allocatedBlock = memoryMap.find(b => b.pid === tempPidForAlloc);
           if(allocatedBlock) {
            addCliOutput(`Memory allocated. Block ID: ${allocatedBlock.id}, Size: ${sizeToAlloc}, Label: ${label}`);
            // Update block to be user_allocated and remove pid as it's not a real process
            setMemoryMap(prevMap => prevMap.map(b => b.id === allocatedBlock.id ? {...b, status: 'user_allocated', pid: undefined} : b));
           } else {
             addCliOutput(`Memory allocated for ${label} (size ${sizeToAlloc}), but block ID not found immediately. Check mem_map.`, 'output');
           }
        } // Error message handled by allocateMemoryForProcess
        break;
      case 'mem_free':
        const idOrPidToFree = args[0];
        if (!idOrPidToFree) {
          addCliOutput("Error: Missing block ID or PID for mem_free.", 'error');
          addKernelLog("Failed mem_free: Missing block ID/PID.");
          break;
        }
        addKernelLog(`System Call: mem_free request for ${idOrPidToFree}.`);
        
        let freed = false;
        const potentialPid = parseInt(idOrPidToFree);
        let targetBlock: MemoryBlock | undefined;

        if (!isNaN(potentialPid)) { // Try freeing by PID first
            targetBlock = memoryMap.find(b => b.pid === potentialPid && (b.status === 'process' || b.status === 'user_allocated'));
            if (targetBlock) {
                 freeMemoryForProcess(potentialPid);
                 freed = true;
            }
        }
        
        if (!freed) { // Try freeing by block ID if PID didn't match or wasn't a number
            targetBlock = memoryMap.find(b => b.id === idOrPidToFree && (b.status === 'process' || b.status === 'user_allocated'));
            if (targetBlock) {
                if (targetBlock.pid) {
                    freeMemoryForProcess(targetBlock.pid);
                } else {
                    // Direct free for non-process blocks (e.g. user_allocated via mem_alloc)
                    setMemoryMap(prevMap => {
                        const updated = prevMap.map(b => b.id === idOrPidToFree ? {...b, status: 'free', label: undefined, pid: undefined } : b);
                        // Coalesce logic (simplified, full logic in freeMemoryForProcess)
                        updated.sort((a,b) => a.address - b.address);
                        const coalesced: MemoryBlock[] = [];
                        let i = 0;
                        while (i < updated.length) {
                            let current = {...updated[i]};
                            if (current.status === 'free') {
                                let j = i + 1;
                                while (j < updated.length && updated[j].status === 'free' && updated[j].address === current.address + current.size) {
                                    current.size += updated[j].size;
                                    current.id = uniqueId('mem_free_coalesced_');
                                    j++;
                                }
                                i = j - 1;
                            }
                            coalesced.push(current);
                            i++;
                        }
                        return coalesced;
                    });
                }
                freed = true;
            }
        }

        if (freed) {
          addCliOutput(`Memory for ${idOrPidToFree} freed.`);
        } else {
          addCliOutput(`Error: Block/PID ${idOrPidToFree} not found or not eligible for free.`, 'error');
          addKernelLog(`mem_free failed: ${idOrPidToFree} invalid or not found.`);
        }
        break;
      // Filesystem commands
      case 'ls':
        const listPath = args[0] ? resolvePath(args[0]) : currentPath;
        const nodeToList = getNodeByPath(listPath);
        if (nodeToList && nodeToList.type === 'directory' && nodeToList.children) {
          addCliOutput(`Contents of ${listPath}:`);
          Object.values(nodeToList.children).forEach(child => {
            addCliOutput(`  ${child.name}${child.type === 'directory' ? '/' : ''} \t(${child.type}, ${new Date(child.lastModified).toLocaleDateString()})`);
          });
          if (Object.keys(nodeToList.children).length === 0) addCliOutput("  (empty)");
        } else {
          addCliOutput(`Error: Path ${listPath} not found or not a directory.`, 'error');
        }
        break;
      case 'cat':
        if (!args[0]) { addCliOutput("Usage: cat <filepath>", 'error'); break; }
        const filePathToCat = resolvePath(args[0]);
        const fileNodeToCat = getNodeByPath(filePathToCat);
        if (fileNodeToCat && fileNodeToCat.type === 'file') {
          addCliOutput(fileNodeToCat.content || "(empty file)");
        } else {
          addCliOutput(`Error: File ${filePathToCat} not found or is a directory.`, 'error');
        }
        break;
      case 'touch':
        if (!args[0]) { addCliOutput("Usage: touch <filepath>", 'error'); break; }
        const pathForTouch = resolvePath(args[0]);
        const parentTouchPath = normalizePath(pathForTouch.substring(0, pathForTouch.lastIndexOf('/')));
        const touchFileName = pathForTouch.substring(pathForTouch.lastIndexOf('/') + 1);
        
        let parentNodeForTouch = getNodeByPath(parentTouchPath);
        if (!parentNodeForTouch && parentTouchPath === '/') parentNodeForTouch = filesystem['/'];


        if (parentNodeForTouch && parentNodeForTouch.type === 'directory' && parentNodeForTouch.children) {
          const now = new Date().toISOString();
          if (parentNodeForTouch.children[touchFileName]) { // File exists, update timestamp
            parentNodeForTouch.children[touchFileName].lastModified = now;
          } else { // Create new file
            parentNodeForTouch.children[touchFileName] = {
              id: pathForTouch, name: touchFileName, type: 'file', parentId: parentNodeForTouch.id, content: '', lastModified: now
            };
          }
          setFilesystem({...filesystem}); // Trigger re-render
          addKernelLog(`File ${pathForTouch} touched/created.`);
        } else {
          addCliOutput(`Error: Cannot touch file in ${parentTouchPath}. Path not found or not a directory.`, 'error');
        }
        break;
      case 'mkdir':
        if (!args[0]) { addCliOutput("Usage: mkdir <path>", 'error'); break; }
        const pathForMkdir = resolvePath(args[0]);
        const parentMkdirPath = normalizePath(pathForMkdir.substring(0, pathForMkdir.lastIndexOf('/')));
        const newDirName = pathForMkdir.substring(pathForMkdir.lastIndexOf('/') + 1);

        let parentNodeForMkdir = getNodeByPath(parentMkdirPath);
         if (!parentNodeForMkdir && parentMkdirPath === '/') parentNodeForMkdir = filesystem['/'];

        if (parentNodeForMkdir && parentNodeForMkdir.type === 'directory' && parentNodeForMkdir.children) {
          if (parentNodeForMkdir.children[newDirName]) {
            addCliOutput(`Error: ${pathForMkdir} already exists.`, 'error');
          } else {
            parentNodeForMkdir.children[newDirName] = {
              id: pathForMkdir, name: newDirName, type: 'directory', parentId: parentNodeForMkdir.id, children: {}, lastModified: new Date().toISOString()
            };
            setFilesystem({...filesystem});
            addKernelLog(`Directory ${pathForMkdir} created.`);
          }
        } else {
          addCliOutput(`Error: Cannot create directory in ${parentMkdirPath}. Path not found or not a directory.`, 'error');
        }
        break;
      case 'cd':
        if (!args[0]) { setCurrentPath(resolvePath('/home/user')); addCliOutput(`Changed directory to ${resolvePath('/home/user')}`); break; }
        const targetCdPath = resolvePath(args[0]);
        const nodeToCd = getNodeByPath(targetCdPath);
        if (nodeToCd && nodeToCd.type === 'directory') {
          setCurrentPath(targetCdPath);
          addCliOutput(`Current directory: ${targetCdPath}`);
        } else {
          addCliOutput(`Error: Path ${targetCdPath} not found or not a directory.`, 'error');
        }
        break;
      case 'pwd':
        addCliOutput(currentPath);
        break;
      // Process Management
      case 'ps':
        addKernelLog("Userland 'ps' command executed.");
        if (processes.length === 0) { addCliOutput("No active processes."); break; }
        addCliOutput("PID\tUSER\tPRI\tSTATUS\t\tMEM\tCOMMAND");
        processes.forEach(p => {
          addCliOutput(`${p.pid}\t${p.user}\t${p.priority}\t${p.status.padEnd(8,' ')}\t${(p.memoryFootprint || 0)}kb\t${p.command}`);
        });
        break;
      case 'kill':
        if (!args[0]) { addCliOutput("Usage: kill <pid>", 'error'); break; }
        const pidToKill = parseInt(args[0]);
        if (isNaN(pidToKill)) { addCliOutput("Error: PID must be a number.", 'error'); break; }

        const processToKill = processes.find(p => p.pid === pidToKill);
        if (!processToKill) { addCliOutput(`Error: Process with PID ${pidToKill} not found.`, 'error'); break; }
        if (pidToKill <= 2) { // Assuming PIDs 1 and 2 are kernel/vm based on typical init
             addCliOutput(`Error: Cannot kill essential system process PID ${pidToKill}.`, 'error');
             addKernelLog(`Attempt to kill system process ${pidToKill} blocked.`);
             break;
        }
        
        setProcesses(prev => prev.filter(p => p.pid !== pidToKill));
        addCliOutput(`Process ${pidToKill} (${processToKill.command}) terminated.`);
        addKernelLog(`Process ${pidToKill} (${processToKill.command}) killed by user.`);
        freeMemoryForProcess(pidToKill); // Free associated memory

        // Clear any simulation intervals associated with this PID
        if (simulationIntervals.current[pidToKill]) {
          clearInterval(simulationIntervals.current[pidToKill]);
          delete simulationIntervals.current[pidToKill];
          addKernelLog(`Cleaned up simulation interval for killed PID ${pidToKill}.`);
        }
        break;
      case 'nice':
        if (args.length < 2) { addCliOutput("Usage: nice <pid> <priority>", 'error'); break; }
        const pidToNice = parseInt(args[0]);
        const newPriority = parseInt(args[1]);
        if (isNaN(pidToNice) || isNaN(newPriority)) { addCliOutput("Error: PID and priority must be numbers.", 'error'); break; }
        if (newPriority < 0 || newPriority > 19) { addCliOutput("Error: Priority must be between 0 (high) and 19 (low).", 'error'); break; }
        
        const processToNice = processes.find(p => p.pid === pidToNice);
        if (!processToNice) { addCliOutput(`Error: Process with PID ${pidToNice} not found.`, 'error'); break; }
        if (pidToNice <=2 && processToNice.user === 'root') {
            addCliOutput(`Warning: Changing priority of system process PID ${pidToNice}.`, 'output');
        }

        setProcesses(prev => prev.map(p => p.pid === pidToNice ? { ...p, priority: newPriority } : p));
        addCliOutput(`Priority of process ${pidToNice} (${processToNice.command}) changed to ${newPriority}.`);
        addKernelLog(`Priority for PID ${pidToNice} set to ${newPriority}.`);
        break;
      case 'run':
        const scriptName = args[0];
        if (!scriptName) {
          addCliOutput("Error: Missing script name for 'run'. Usage: run <script.py>", 'error');
          break;
        }
        const scriptPath = scriptName.includes('/') ? resolvePath(scriptName) : resolvePath(`${currentPath}/${scriptName}`);
        const scriptNode = getNodeByPath(scriptPath);

        if (!scriptNode || scriptNode.type !== 'file' || !scriptNode.name.endsWith('.py')) {
          addCliOutput(`Error: Script '${scriptName}' not found at '${scriptPath}' or not a .py file.`, 'error');
          addKernelLog(`Script run failed: ${scriptName} not found or invalid.`);
          break;
        }

        addKernelLog(`Userland attempting to run script: ${scriptNode.name} from ${scriptPath}`);
        addCliOutput(`Running ${scriptNode.name}...`);

        const pid = nextPid;
        setNextPid(prev => prev + 1);
        const newProcess: Process = { pid, command: scriptNode.name, status: 'running', priority: 10, startTime: new Date().toISOString(), user: 'user' };
        
        if (!allocateMemoryForProcess(pid, DEFAULT_USER_PROCESS_MEMORY, scriptNode.name)) {
          addKernelLog(`Failed to start ${scriptNode.name} (PID ${pid}) due to OOM.`);
          // nextPid was already incremented, this is fine. Memory allocation failure handles CLI output.
          break; 
        }
        setProcesses(prev => [...prev, newProcess]);
        addKernelLog(`Process ${pid} (${scriptNode.name}) started.`);

        // Simulate script execution based on name
        if (scriptNode.name === 'hello.py') {
          addCliOutput("Hello from MicroPython in ForthOS!");
          setTimeout(() => {
            setProcesses(prev => prev.filter(p => p.pid !== pid));
            freeMemoryForProcess(pid);
            addKernelLog(`Process ${pid} (hello.py) finished.`);
          }, 500);
        } else if (scriptNode.name === 'test_mem.py') {
          addCliOutput("Script test_mem.py requesting 10 units of memory...");
          handleCommand("mem_alloc 10 ScriptAlloc"); // Simulate script action, which itself makes a call
          setTimeout(() => {
            setProcesses(prev => prev.filter(p => p.pid !== pid));
            freeMemoryForProcess(pid);
            // Note: mem_alloc by script won't be tied to this script's PID directly unless we change mem_alloc
            addKernelLog(`Process ${pid} (test_mem.py) finished.`);
          }, 1000);
        } else if (scriptNode.name === 'blink.py') {
          let blinks = 0;
          const maxBlinks = 3;
          const intervalId = setInterval(() => {
            if (blinks < maxBlinks) {
              addCliOutput(`[${scriptNode.name}] LED ON`);
              setTimeout(() => addCliOutput(`[${scriptNode.name}] LED OFF`), 400);
              blinks++;
            } else {
              clearInterval(intervalId);
              delete simulationIntervals.current[pid];
              addCliOutput(`${scriptNode.name} finished.`);
              setProcesses(prev => prev.filter(p => p.pid !== pid));
              freeMemoryForProcess(pid);
              addKernelLog(`Process ${pid} (${scriptNode.name}) finished.`);
            }
          }, 800);
          simulationIntervals.current[pid] = intervalId;
        } else if (scriptNode.name === 'iot_sensor.py') {
           addCliOutput(`[${scriptNode.name}] Reading temperature... ${ (20 + Math.random() * 10).toFixed(1)} C`);
           setTimeout(() => {
             addCliOutput(`[${scriptNode.name}] Reading humidity... ${(40 + Math.random() * 30).toFixed(1)} %`);
             setProcesses(prev => prev.filter(p => p.pid !== pid));
             freeMemoryForProcess(pid);
             addKernelLog(`Process ${pid} (${scriptNode.name}) finished.`);
           }, 1200);
        } else {
           addCliOutput(`Output from ${scriptNode.name}: (Generic script execution)`);
           if (scriptNode.content) {
             scriptNode.content.split('\n').forEach(line => addCliOutput(line));
           }
           setTimeout(() => {
            setProcesses(prev => prev.filter(p => p.pid !== pid));
            freeMemoryForProcess(pid);
            addKernelLog(`Process ${pid} (${scriptNode.name}) finished.`);
           }, 500);
        }
        break;
      default:
        addCliOutput(`Error: Command not found: ${cmdLower}. Type 'help' for available commands.`, 'error');
        addKernelLog(`Unknown command received: ${cmdLower}`);
    }
  };

  if (isBooting) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground font-mono items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-primary mb-4">ForthOS v0.1</h1>
          <div className="h-64 overflow-y-auto border border-border p-2 mb-4 rounded text-left text-sm bg-card">
            {cliHistory.filter(item => item.type === 'system').map(item => (
              <div key={item.id} className="whitespace-pre-wrap break-words">{item.text}</div>
            ))}
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 mb-2">
            <div className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-linear" style={{ width: `${bootProgress}%` }}></div>
          </div>
          <p className="text-sm text-muted-foreground">Booting... {bootProgress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-mono">
      <header className="p-2 border-b border-border text-center shadow-sm">
        <h1 className="text-xl font-semibold text-primary">ForthOS v0.1</h1>
      </header>
      <main className="flex flex-1 flex-col md:flex-row gap-4 p-4 overflow-hidden">
        <div className="flex-grow-[3] basis-2/3 min-h-0">
          <CLIComponent 
            history={cliHistory.filter(item => item.type !== 'system')} 
            onCommand={handleCommand} 
            currentPath={currentPath}
            isBooting={isBooting} 
          />
        </div>
        <div className="flex-grow-[1] basis-1/3 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0">
            <KernelLogComponent logs={kernelLogs} />
          </div>
          <div className="flex-1 min-h-0">
            <MemoryVisualizerComponent memoryBlocks={memoryMap} />
          </div>
        </div>
      </main>
    </div>
  );
}
