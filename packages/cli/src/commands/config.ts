import { Command } from 'commander';
import chalk from 'chalk';
import {
  loadConfig,
  getLabel,
  setLabel,
  resetLabels,
  getConfigFilePath,
  NodeLabels,
  DEFAULT_LABELS
} from '../config';

type NodeType = 'thread' | 'container' | 'group';
const validNodeTypes: NodeType[] = ['thread', 'container', 'group'];

export const configCommand = new Command('config')
  .description('Manage CLI configuration')
  .addCommand(
    new Command('show')
      .description('Show current configuration')
      .action(() => {
        const config = loadConfig();
        console.log(chalk.bold.underline('Configuration'));
        console.log(`File: ${chalk.dim(getConfigFilePath())}`);
        console.log('');
        console.log(chalk.bold('Labels:'));
        for (const nodeType of validNodeTypes) {
          const label = config.labels[nodeType];
          const displayLabel = label || chalk.dim('(none)');
          const isDefault = label === DEFAULT_LABELS[nodeType];
          const defaultMarker = isDefault ? chalk.dim(' [default]') : '';
          console.log(`  ${nodeType}: ${displayLabel}${defaultMarker}`);
        }
      })
  )
  .addCommand(
    new Command('get')
      .description('Get a configuration value')
      .argument('<key>', 'Config key (e.g., label.thread, label.container, label.group)')
      .action((key: string) => {
        const parts = key.split('.');
        if (parts.length !== 2 || parts[0] !== 'label') {
          console.log(chalk.red(`Invalid key "${key}". Use format: label.<nodeType>`));
          console.log(chalk.dim(`Valid keys: ${validNodeTypes.map(t => 'label.' + t).join(', ')}`));
          return;
        }

        const nodeType = parts[1] as NodeType;
        if (!validNodeTypes.includes(nodeType)) {
          console.log(chalk.red(`Invalid node type "${nodeType}".`));
          console.log(chalk.dim(`Valid types: ${validNodeTypes.join(', ')}`));
          return;
        }

        const value = getLabel(nodeType);
        if (value) {
          console.log(value);
        } else {
          console.log(chalk.dim('(empty)'));
        }
      })
  )
  .addCommand(
    new Command('set')
      .description('Set a configuration value')
      .argument('<key>', 'Config key (e.g., label.thread, label.container, label.group)')
      .argument('<value>', 'New value (use "" for empty)')
      .action((key: string, value: string) => {
        const parts = key.split('.');
        if (parts.length !== 2 || parts[0] !== 'label') {
          console.log(chalk.red(`Invalid key "${key}". Use format: label.<nodeType>`));
          console.log(chalk.dim(`Valid keys: ${validNodeTypes.map(t => 'label.' + t).join(', ')}`));
          return;
        }

        const nodeType = parts[1] as NodeType;
        if (!validNodeTypes.includes(nodeType)) {
          console.log(chalk.red(`Invalid node type "${nodeType}".`));
          console.log(chalk.dim(`Valid types: ${validNodeTypes.join(', ')}`));
          return;
        }

        // Handle empty string
        const newValue = value === '""' || value === "''" ? '' : value;
        setLabel(nodeType, newValue);

        console.log(chalk.green(`Set ${key} = ${newValue || chalk.dim('(empty)')}`));
      })
  )
  .addCommand(
    new Command('reset')
      .description('Reset labels to defaults')
      .option('--all', 'Reset all configuration (same as labels for now)')
      .action((options: { all?: boolean }) => {
        resetLabels();
        console.log(chalk.green('Labels reset to defaults:'));
        for (const nodeType of validNodeTypes) {
          const label = DEFAULT_LABELS[nodeType];
          const displayLabel = label || chalk.dim('(none)');
          console.log(`  ${nodeType}: ${displayLabel}`);
        }
      })
  );
