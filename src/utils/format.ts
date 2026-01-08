import chalk from 'chalk';
import { Thread, ThreadStatus, Temperature, ThreadSize, Importance } from '../models';

// Color mappings
const statusColors: Record<ThreadStatus, (s: string) => string> = {
  active: chalk.green,
  paused: chalk.yellow,
  stopped: chalk.red,
  completed: chalk.blue,
  archived: chalk.gray
};

const temperatureColors: Record<Temperature, (s: string) => string> = {
  frozen: chalk.blueBright,
  freezing: chalk.cyan,
  cold: chalk.blue,
  tepid: chalk.white,
  warm: chalk.yellow,
  hot: chalk.red
};

const sizeLabels: Record<ThreadSize, string> = {
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  huge: 'Huge'
};

export function formatStatus(status: ThreadStatus): string {
  return statusColors[status](status.toUpperCase());
}

export function formatTemperature(temp: Temperature): string {
  return temperatureColors[temp](temp.charAt(0).toUpperCase() + temp.slice(1));
}

export function formatSize(size: ThreadSize): string {
  return sizeLabels[size];
}

export function formatImportance(imp: Importance): string {
  const filled = '[*]'.repeat(imp);
  const empty = '[ ]'.repeat(5 - imp);
  return chalk.yellow(filled) + chalk.dim(empty);
}

export function formatThreadSummary(thread: Thread): string {
  const lines = [
    `${chalk.bold(thread.name)} ${chalk.gray(`[${thread.id.slice(0, 8)}]`)}`,
    `  Status: ${formatStatus(thread.status)} | Temp: ${formatTemperature(thread.temperature)} | Size: ${formatSize(thread.size)} | Importance: ${formatImportance(thread.importance)}`
  ];

  if (thread.description) {
    lines.push(`  ${chalk.dim(thread.description)}`);
  }

  return lines.join('\n');
}

export function formatThreadDetail(thread: Thread): string {
  const lines = [
    chalk.bold.underline(thread.name),
    '',
    `ID:          ${thread.id}`,
    `Status:      ${formatStatus(thread.status)}`,
    `Temperature: ${formatTemperature(thread.temperature)}`,
    `Size:        ${formatSize(thread.size)}`,
    `Importance:  ${formatImportance(thread.importance)}`,
    `Created:     ${new Date(thread.createdAt).toLocaleString()}`,
    `Updated:     ${new Date(thread.updatedAt).toLocaleString()}`,
  ];

  if (thread.description) {
    lines.push('', `Description: ${thread.description}`);
  }

  if (thread.parentId) {
    lines.push(`Parent:      ${thread.parentId}`);
  }

  if (thread.groupId) {
    lines.push(`Group:       ${thread.groupId}`);
  }

  if (thread.dependencies.length > 0) {
    lines.push('', chalk.bold('Dependencies:'));
    thread.dependencies.forEach(dep => {
      lines.push(`  → ${dep.threadId}`);
      if (dep.why) lines.push(`    Why: ${dep.why}`);
      if (dep.what) lines.push(`    What: ${dep.what}`);
      if (dep.how) lines.push(`    How: ${dep.how}`);
      if (dep.when) lines.push(`    When: ${dep.when}`);
    });
  }

  if (thread.progress.length > 0) {
    lines.push('', chalk.bold('Progress:'));
    // Show last 5 entries
    const recent = thread.progress.slice(-5);
    recent.forEach(p => {
      const date = new Date(p.timestamp).toLocaleString();
      lines.push(`  [${chalk.dim(date)}] ${p.note}`);
    });
    if (thread.progress.length > 5) {
      lines.push(chalk.dim(`  ... and ${thread.progress.length - 5} more entries`));
    }
  }

  return lines.join('\n');
}
