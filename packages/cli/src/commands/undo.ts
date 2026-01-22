import { Command } from 'commander';
import {
  loadData,
  loadBackupData,
  getBackupInfo,
  restoreFromBackup,
  getBackupFilePath
} from 'threads-storage';
import chalk from 'chalk';

export const undoCommand = new Command('undo')
  .description('Undo the last change by restoring from backup')
  .option('--dry-run', 'Show what would be restored without making changes')
  .option('--list', 'Show backup info and timestamp')
  .action((options) => {
    const backupInfo = getBackupInfo();

    // Handle --list: show backup metadata
    if (options.list) {
      if (!backupInfo.exists) {
        console.log(chalk.yellow('No backup exists yet.'));
        console.log(chalk.dim('A backup is created before each data modification.'));
        return;
      }

      console.log(chalk.bold('\nBackup Info:'));
      console.log(`  Path:     ${getBackupFilePath()}`);
      console.log(`  Created:  ${backupInfo.timestamp!.toLocaleString()}`);
      console.log(`  Threads:  ${backupInfo.threadCount}`);
      console.log(`  Groups:   ${backupInfo.groupCount}`);
      console.log('');
      return;
    }

    // Check if backup exists
    if (!backupInfo.exists) {
      console.log(chalk.red('No backup available to restore.'));
      console.log(chalk.dim('A backup is created automatically before each data modification.'));
      return;
    }

    const backupData = loadBackupData();
    if (!backupData) {
      console.log(chalk.red('Failed to load backup data.'));
      return;
    }

    const currentData = loadData();

    // Handle --dry-run: show diff summary
    if (options.dryRun) {
      console.log(chalk.bold('\nDry run - would restore to:'));
      console.log(`  Backup from: ${backupInfo.timestamp!.toLocaleString()}`);
      console.log('');
      console.log(chalk.bold('Current state:'));
      console.log(`  Threads: ${currentData.threads.length}`);
      console.log(`  Groups:  ${currentData.groups.length}`);
      console.log('');
      console.log(chalk.bold('After restore:'));
      console.log(`  Threads: ${backupData.threads.length}`);
      console.log(`  Groups:  ${backupData.groups.length}`);
      console.log('');

      // Show thread-level changes
      const currentIds = new Set(currentData.threads.map(t => t.id));
      const backupIds = new Set(backupData.threads.map(t => t.id));

      const added = currentData.threads.filter(t => !backupIds.has(t.id));
      const removed = backupData.threads.filter(t => !currentIds.has(t.id));
      const modified = currentData.threads.filter(t => {
        if (!backupIds.has(t.id)) return false;
        const backup = backupData.threads.find(b => b.id === t.id);
        return backup && backup.updatedAt !== t.updatedAt;
      });

      if (added.length > 0 || removed.length > 0 || modified.length > 0) {
        console.log(chalk.bold('Thread changes that would be undone:'));
        added.forEach(t => console.log(chalk.red(`  - Remove: "${t.name}"`)));
        removed.forEach(t => console.log(chalk.green(`  + Restore: "${t.name}"`)));
        modified.forEach(t => console.log(chalk.yellow(`  ~ Revert: "${t.name}"`)));
        console.log('');
      }

      console.log(chalk.dim('Run without --dry-run to apply.'));
      return;
    }

    // Perform restore (swap current with backup)
    const success = restoreFromBackup();
    if (!success) {
      console.log(chalk.red('Failed to restore from backup.'));
      return;
    }

    console.log(chalk.green('\nRestored from backup.'));
    console.log(chalk.dim(`Backup timestamp: ${backupInfo.timestamp!.toLocaleString()}`));
    console.log(chalk.dim('Run "threads undo" again to redo (swap back).'));
    console.log('');
  });
