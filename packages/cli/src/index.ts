#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init } from './commands/init';
import { add } from './commands/add';
import { remove } from './commands/remove';
import { list } from './commands/list';
import { sync } from './commands/sync';
import { validate } from './commands/validate';

const program = new Command();

program
  .name('claudemesh')
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
  .action(async (domain: string) => {
    await add(domain);
  });

program
  .command('remove <domain>')
  .description('Remove a domain package')
  .action(async (domain: string) => {
    await remove(domain);
  });

program
  .command('list')
  .description('List installed domains')
  .action(async () => {
    await list();
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
  console.log(chalk.cyan('  claudemesh init'));
  console.log(chalk.cyan('  claudemesh add git'));
  console.log(chalk.cyan('  claudemesh add backend-node'));
  console.log(chalk.cyan('  claudemesh list'));
  console.log();
}
