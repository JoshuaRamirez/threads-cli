import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ThreadsConfig, NodeLabels, DEFAULT_CONFIG, DEFAULT_LABELS } from './types';

const DATA_DIR = path.join(os.homedir(), '.threads');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Deep merge with defaults to handle partial configs
function mergeWithDefaults(config: Partial<ThreadsConfig>): ThreadsConfig {
  return {
    labels: {
      ...DEFAULT_LABELS,
      ...(config.labels || {}),
    },
  };
}

// Load configuration (creates default if missing)
export function loadConfig(): ThreadsConfig {
  ensureDataDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ThreadsConfig>;
    return mergeWithDefaults(parsed);
  } catch {
    // If config is corrupted, return defaults
    return { ...DEFAULT_CONFIG };
  }
}

// Save configuration
export function saveConfig(config: ThreadsConfig): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Get a specific label
export function getLabel(nodeType: keyof NodeLabels): string {
  const config = loadConfig();
  return config.labels[nodeType];
}

// Set a specific label
export function setLabel(nodeType: keyof NodeLabels, value: string): void {
  const config = loadConfig();
  config.labels[nodeType] = value;
  saveConfig(config);
}

// Reset labels to defaults
export function resetLabels(): void {
  const config = loadConfig();
  config.labels = { ...DEFAULT_LABELS };
  saveConfig(config);
}

// Reset entire config to defaults
export function resetConfig(): void {
  saveConfig({ ...DEFAULT_CONFIG });
}

// Get config file path (for debugging/display)
export function getConfigFilePath(): string {
  return CONFIG_FILE;
}
