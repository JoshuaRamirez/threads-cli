// Configuration types for threads CLI

// Node type labels for display
export interface NodeLabels {
  thread: string;
  container: string;
  group: string;
}

// Complete configuration structure
export interface ThreadsConfig {
  labels: NodeLabels;
}

// Default labels
export const DEFAULT_LABELS: NodeLabels = {
  thread: '',           // No prefix by default (maintains current behavior)
  container: '\u{1F4C1}', // folder emoji
  group: '\u{1F3F7}\u{FE0F}', // label emoji
};

// Default configuration
export const DEFAULT_CONFIG: ThreadsConfig = {
  labels: { ...DEFAULT_LABELS },
};
