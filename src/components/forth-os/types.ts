export type CLIOutput = {
  id: string;
  type: 'input' | 'output' | 'error';
  text: string;
};

export type KernelLogEntry = {
  id: string;
  timestamp: string;
  message: string;
};

export type MemoryBlock = {
  id: string;
  address: number;
  size: number;
  status: 'kernel' | 'micropython_vm' | 'user_allocated' | 'free';
  label?: string; // e.g., "Process Alpha"
};

export const TOTAL_MEMORY_SIZE = 256;
export const KERNEL_MEMORY_SIZE = 64;
export const MICROPYTHON_VM_MEMORY_SIZE = 32;
