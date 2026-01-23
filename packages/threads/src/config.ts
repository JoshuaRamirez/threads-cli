import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Firebase configuration for multi-tenant storage.
 */
export interface FirebaseConfig {
  tenantId: string;
  projectId: string;
}

/**
 * Configuration shape for the threads composition package.
 */
export interface ThreadsConfig {
  /** Storage backend: 'json' for local file, 'firebase' for Firestore */
  storage: 'json' | 'firebase';
  /** Firebase configuration (required when storage === 'firebase') */
  firebase?: FirebaseConfig;
}

const CONFIG_DIR = path.join(os.homedir(), '.threads');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: ThreadsConfig = {
  storage: 'json',
};

/**
 * Load configuration from ~/.threads/config.json.
 * Returns default config if file does not exist or is invalid.
 */
export function loadConfig(): ThreadsConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ThreadsConfig>;

    // Validate and merge with defaults
    const config: ThreadsConfig = {
      storage: parsed.storage === 'firebase' ? 'firebase' : 'json',
    };

    if (config.storage === 'firebase' && parsed.firebase) {
      config.firebase = {
        tenantId: parsed.firebase.tenantId || '',
        projectId: parsed.firebase.projectId || '',
      };
    }

    return config;
  } catch (error) {
    console.error('[threads] Failed to load config, using defaults:', error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to ~/.threads/config.json.
 */
export function saveConfig(config: ThreadsConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Get the config file path.
 */
export function getConfigFilePath(): string {
  return CONFIG_FILE;
}
