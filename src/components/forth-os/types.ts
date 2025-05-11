export type CLIOutput = {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
};

export type KernelLogEntry = {
  id: string;
  timestamp: string; // ISO string format
  message: string;
};

export type MemoryBlockStatus = 'kernel' | 'micropython_vm' | 'user_allocated' | 'free' | 'process';
export type MemoryBlock = {
  id:string;
  address: number;
  size: number;
  status: MemoryBlockStatus;
  label?: string; // e.g., "Process Alpha"
  pid?: number; // Link to process if memory is allocated for one
};

export const TOTAL_MEMORY_SIZE = 256; // units (e.g., KB)
export const KERNEL_MEMORY_SIZE = 32; // Increased slightly for new features
export const MICROPYTHON_VM_MEMORY_SIZE = 32;

// Filesystem Types
export type FileType = 'file' | 'directory';

export interface FileSystemNode {
  id: string;
  name: string;
  type: FileType;
  parentId: string | null; // null for root
  lastModified: string; // ISO string
  content?: string; // For files
  children?: Record<string, FileSystemNode>; // For directories
}

export type FileSystemTree = Record<string, FileSystemNode>; // id as key

// Process Management Types
export interface Process {
  pid: number;
  command: string;
  status: 'running' | 'stopped' | 'zombie' | 'idle';
  priority: number; // Lower is higher priority (e.g., 0-19)
  startTime: string; // ISO string
  user: 'root' | 'user';
  memoryFootprint?: number; // Optional: for mem_alloc integration
  cpuTime?: number; // Simulated CPU time
}

export const DEFAULT_USER_PROCESS_MEMORY = 8; // Default memory for a new user process
