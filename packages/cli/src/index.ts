#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init } from './commands/init';
import { add } from './commands/add';
import { remove } from './commands/remove';
import { list } from './commands/list';
import { sync } from './commands/sync';
import { validate } from './commands/validate';
import { available } from './commands/available';

const program = new Command();

program
  .name('ccmesh')
  .description('CLI tool for managing ClaudeMesh domain packages')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize ClaudeMesh in the current project')
  .action(async () => {
    await init();
  });

program
  .command('add <domain>')
  .description('Add a domain package (e.g., git, backend-node, frontend-react)')
  .option('-g, --global', 'Install globally to ~/.claude/ (available in all projects)')
  .action(async (domain: string, options) => {
    await add(domain, options.global);
  });

program
  .command('remove <domain>')
  .description('Remove a domain package')
  .option('-g, --global', 'Remove from global installation (~/.claude/)')
  .action(async (domain: string, options) => {
    await remove(domain, options.global);
  });

program
  .command('list')
  .description('List installed domains')
  .action(async () => {
    await list();
  });

program
  .command('available')
  .description('List all available domains to install')
  .action(async () => {
    await available();
  });

program
  .command('sync')
  .description('Re-sync domains from node_modules')
  .action(async () => {
    await sync();
  });

program
  .command('validate')
  .description('Validate all agent and skill files')
  .action(async () => {
    await validate();
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.blue.bold('\n🌐 ClaudeMesh CLI\n'));
  program.outputHelp();
  console.log();
  console.log(chalk.gray('Examples:'));
  console.log(chalk.cyan('  ccmesh init'));
  console.log(chalk.cyan('  ccmesh add git'));
  console.log(chalk.cyan('  ccmesh add backend-node'));
  console.log(chalk.cyan('  ccmesh list'));
  console.log(chalk.cyan('  ccmesh available'));
  console.log();
}
