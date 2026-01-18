import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { getDomainInfo, removeDomainFromManifest, getAllDomainsCombined } from '../utils/manifest';
import { removeDomainFiles } from '../utils/file-copier';

export async function remove(domainName: string, global = false): Promise<void> {
  const location = global ? 'globally' : 'locally';
  console.log(chalk.yellow.bold(`\n🗑️  Removing @claudemesh/${domainName} ${location}...\n`));

  const spinner = ora('Checking domain').start();

  try {
    // Get domain info from manifest
    const domainInfo = await getDomainInfo(domainName, global);

    if (!domainInfo) {
      spinner.fail('Domain not found');

      // Check if it exists in the other location
      const otherLocationInfo = await getDomainInfo(domainName, !global);
      if (otherLocationInfo) {
        const otherLocation = global ? 'local' : 'global';
        console.error(chalk.yellow(`\n⚠️  Domain "${domainName}" is not installed ${location}.`));
        console.log(chalk.gray(`\nIt is installed ${otherLocation}ly. Use:`));
        console.log(chalk.cyan(`  ccmesh remove --global ${domainName}\n`));
      } else {
        console.error(chalk.red(`\n❌ Domain "${domainName}" is not installed.`));
        console.log(chalk.gray('\nUse'), chalk.cyan('ccmesh list'), chalk.gray('to see installed domains.\n'));
      }
      process.exit(1);
    }

    spinner.stop();

    // Confirm removal
    console.log(chalk.yellow('This will remove:'));
    console.log(chalk.gray(`  - ${domainInfo.agents.length} agents`));
    console.log(chalk.gray(`  - ${domainInfo.skills.length} skills`));
    if (global) {
      console.log(chalk.magenta(`  - From: ~/.claude/`));
    }
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
    await removeDomainFiles(domainInfo.agents, domainInfo.skills, global);
    spinner.succeed('Removed files');

    // Update manifest
    spinner.start('Updating manifest');
    await removeDomainFromManifest(domainName, global);
    spinner.succeed('Updated manifest');

    const locationText = global ? chalk.magenta('globally') : chalk.cyan('locally');
    console.log(chalk.green('\n✅ Successfully removed ') + chalk.cyan(`@claudemesh/${domainName}`) + chalk.gray(` ${locationText}\n`));
  } catch (error) {
    spinner.fail('Failed to remove domain');
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
