import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import { copyDomainFiles, ensureClaudeDirectory } from '../utils/file-copier';
import { addDomainToManifest } from '../utils/manifest';

/**
 * Find a local package in the monorepo structure
 * Searches upward from current directory looking for packages/{domainName}
 */
async function findLocalPackage(domainName: string): Promise<string | null> {
  const packageName = `@claudemesh/${domainName}`;
  let currentDir = process.cwd();

  // Search up the directory tree for a packages/ directory
  while (currentDir !== path.dirname(currentDir)) {
    const packagesDir = path.join(currentDir, 'packages');
    const packageDir = path.join(packagesDir, domainName);
    const packageJsonPath = path.join(packageDir, 'package.json');

    try {
      // Check if package.json exists and has the correct name
      const packageJson = await fs.readJSON(packageJsonPath);
      if (packageJson.name === packageName) {
        return packageDir;
      }
    } catch {
      // Package not found here, continue searching
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

export async function add(domainName: string, global = false): Promise<void> {
  const location = global ? 'globally' : 'locally';
  console.log(chalk.blue.bold(`\n📦 Adding @claudemesh/${domainName} ${location}...\n`));

  // Ensure .claude/ directory exists
  await ensureClaudeDirectory(global);

  const packageName = `@claudemesh/${domainName}`;
  const spinner = ora('Checking package installation').start();

  try {
    // Check if package is installed
    let packagePath: string;
    try {
      packagePath = path.dirname(require.resolve(`${packageName}/package.json`, {
        paths: [process.cwd()],
      }));
      spinner.succeed(`Package ${packageName} is already installed`);
    } catch {
      // Package not installed, check for local package or install it
      spinner.text = `Looking for ${packageName}...`;
      const localPackagePath = await findLocalPackage(domainName);

      if (localPackagePath) {
        // Local package found, use it directly
        spinner.succeed(`Found local ${packageName}`);
        packagePath = localPackagePath;
      } else {
        // Try to install from npm
        spinner.text = `Installing ${packageName}...`;
        try {
          execSync(`npm install ${packageName}`, { stdio: 'pipe' });
          spinner.succeed(`Installed ${packageName}`);
          packagePath = path.dirname(require.resolve(`${packageName}/package.json`, {
            paths: [process.cwd()],
          }));
        } catch (error) {
          spinner.fail(`Failed to install ${packageName}`);
          console.error(chalk.red('\n❌ Error:'), 'Package not found locally or on npm.');
          console.error(chalk.gray('\n💡 Tip:'), 'If this is a local package, make sure you\'re in a ClaudeMesh monorepo or run this command from the packages directory.');
          process.exit(1);
        }
      }
    }

    // Get package version
    const packageJson = await fs.readJSON(path.join(packagePath, 'package.json'));
    const version = packageJson.version;

    // Copy files
    spinner.start('Copying agents and skills');
    const result = await copyDomainFiles(domainName, packagePath, global);
    spinner.succeed('Copied agents and skills');

    // Update manifest
    spinner.start('Updating manifest');
    await addDomainToManifest(domainName, version, result.agents, result.skills, global);
    spinner.succeed('Updated manifest');

    const locationText = global ? chalk.magenta('globally') : chalk.cyan('locally');
    console.log(chalk.green('\n✅ Successfully added ') + chalk.cyan(packageName) + chalk.gray(` ${locationText}`));
    console.log(chalk.gray(`   Agents: ${result.agents.length}`));
    console.log(chalk.gray(`   Skills: ${result.skills.length}`));

    if (global) {
      console.log(chalk.gray(`\n   Location: ~/.claude/`));
      console.log(chalk.magenta(`   Available in all projects!`));
    }
    console.log();
  } catch (error) {
    spinner.fail('Failed to add domain');
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
