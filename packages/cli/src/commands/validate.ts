import chalk from 'chalk';
import ora from 'ora';
import { validateAllFiles } from '../utils/validator';

export async function validate(): Promise<void> {
  console.log(chalk.blue.bold('\n🔍 Validating agents and skills...\n'));

  const spinner = ora('Validating files').start();

  try {
    const results = await validateAllFiles();
    spinner.stop();

    let hasErrors = false;

    // Validate agents
    console.log(chalk.bold('Agents:'));
    if (results.agents.size === 0) {
      console.log(chalk.gray('  No agents found'));
    } else {
      for (const [file, result] of results.agents) {
        if (result.valid) {
          console.log(chalk.green('  ✓'), file);
        } else {
          console.log(chalk.red('  ✗'), file);
          result.errors.forEach(error => {
            console.log(chalk.red('    -'), error);
          });
          hasErrors = true;
        }
      }
    }

    console.log();

    // Validate skills
    console.log(chalk.bold('Skills:'));
    if (results.skills.size === 0) {
      console.log(chalk.gray('  No skills found'));
    } else {
      for (const [dir, result] of results.skills) {
        if (result.valid) {
          console.log(chalk.green('  ✓'), `${dir}/SKILL.md`);
        } else {
          console.log(chalk.red('  ✗'), `${dir}/SKILL.md`);
          result.errors.forEach(error => {
            console.log(chalk.red('    -'), error);
          });
          hasErrors = true;
        }
      }
    }

    console.log();

    if (hasErrors) {
      console.log(chalk.red('❌ Validation failed with errors\n'));
      process.exit(1);
    } else {
      console.log(chalk.green('✅ All files are valid!\n'));
    }
  } catch (error) {
    spinner.fail('Validation failed');
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
