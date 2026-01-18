import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getAllDomains, addDomainToManifest } from '../utils/manifest';
import { copyDomainFiles, removeDomainFiles } from '../utils/file-copier';

export async function sync(): Promise<void> {
  console.log(chalk.blue.bold('\n🔄 Syncing ccmesh domains from node_modules...\n'));

  const spinner = ora('Loading manifest').start();

  try {
    const domains = await getAllDomains();
    const domainNames = Object.keys(domains);

    if (domainNames.length === 0) {
      spinner.info('No domains to sync');
      console.log(chalk.gray('\nUse'), chalk.cyan('ccmesh add <domain>'), chalk.gray('to add domains.\n'));
      return;
    }

    spinner.stop();

    for (const domainName of domainNames) {
      const currentDomain = domains[domainName];
      console.log(chalk.cyan(`\n@claudemesh/${domainName}`));

      const packageName = `@claudemesh/${domainName}`;
      let packagePath: string;

      try {
        packagePath = path.dirname(require.resolve(`${packageName}/package.json`, {
          paths: [process.cwd()],
        }));
      } catch {
        console.log(chalk.yellow('  ⚠ Package not found in node_modules, skipping'));
        continue;
      }

      // Get package version
      const packageJson = await fs.readJSON(path.join(packagePath, 'package.json'));
      const newVersion = packageJson.version;

      if (newVersion !== currentDomain.version) {
        console.log(chalk.yellow(`  📦 Version changed: ${currentDomain.version} → ${newVersion}`));
      }

      // Remove old files
      await removeDomainFiles(currentDomain.agents, currentDomain.skills);

      // Copy new files
      const result = await copyDomainFiles(domainName, packagePath);

      // Update manifest
      await addDomainToManifest(domainName, newVersion, result.agents, result.skills);

      console.log(chalk.green('  ✓ Synced'));
    }

    console.log(chalk.green('\n✅ Sync completed!\n'));
  } catch (error) {
    spinner.fail('Sync failed');
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
