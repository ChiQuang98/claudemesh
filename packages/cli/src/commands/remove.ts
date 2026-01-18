import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { getDomainInfo, removeDomainFromManifest } from '../utils/manifest';
import { removeDomainFiles } from '../utils/file-copier';

export async function remove(domainName: string): Promise<void> {
  console.log(chalk.yellow.bold(`\n🗑️  Removing @claudemesh/${domainName}...\n`));

  const spinner = ora('Checking domain').start();

  try {
    // Get domain info from manifest
    const domainInfo = await getDomainInfo(domainName);

    if (!domainInfo) {
      spinner.fail('Domain not found');
      console.error(chalk.red(`\n❌ Domain "${domainName}" is not installed.`));
      console.log(chalk.gray('\nUse'), chalk.cyan('claudemesh list'), chalk.gray('to see installed domains.\n'));
      process.exit(1);
    }

    spinner.stop();

    // Confirm removal
    console.log(chalk.yellow('This will remove:'));
    console.log(chalk.gray(`  - ${domainInfo.agents.length} agents`));
    console.log(chalk.gray(`  - ${domainInfo.skills.length} skills`));
    console.log();

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Continue?',
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.gray('\nCancelled.\n'));
      return;
    }

    // Remove files
    spinner.start('Removing files');
    await removeDomainFiles(domainInfo.agents, domainInfo.skills);
    spinner.succeed('Removed files');

    // Update manifest
    spinner.start('Updating manifest');
    await removeDomainFromManifest(domainName);
    spinner.succeed('Updated manifest');

    console.log(chalk.green('\n✅ Successfully removed ') + chalk.cyan(`@claudemesh/${domainName}\n`));
  } catch (error) {
    spinner.fail('Failed to remove domain');
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
