import chalk from 'chalk';
import ora from 'ora';
import { ensureClaudeDirectory } from '../utils/file-copier';
import { initManifest } from '../utils/manifest';

export async function init(): Promise<void> {
  console.log(chalk.blue.bold('\n🚀 Initializing ClaudeMesh...\n'));

  const spinner = ora('Creating .claude/ directory structure').start();

  try {
    // Create .claude/agents and .claude/skills directories
    await ensureClaudeDirectory();
    spinner.succeed('Created .claude/ directory structure');

    // Create manifest file
    spinner.start('Creating claudemesh.json manifest');
    await initManifest();
    spinner.succeed('Created claudemesh.json manifest');

    console.log(chalk.green('\n✅ ClaudeMesh initialized successfully!\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('  1. Add domain packages:'));
    console.log(chalk.cyan('     claudemesh add git'));
    console.log(chalk.cyan('     claudemesh add backend-node'));
    console.log(chalk.gray('  2. Start Claude Code:'));
    console.log(chalk.cyan('     claude\n'));
  } catch (error) {
    spinner.fail('Failed to initialize');
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
