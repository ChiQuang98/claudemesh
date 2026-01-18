import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';

interface DomainInfo {
  name: string;
  version: string;
  description: string;
  installed: boolean;
}

// List of known ClaudeMesh domains
const KNOWN_DOMAINS = [
  {
    name: 'git',
    description: 'Git workflow automation (commit, PR, branch management)',
    keywords: ['git', 'commit', 'branch', 'pull-request', 'workflow']
  },
  {
    name: 'backend-node',
    description: 'Node.js/TypeScript backend development (API, auth, database)',
    keywords: ['backend', 'nodejs', 'typescript', 'api', 'express', 'nestjs']
  },
  {
    name: 'frontend-react',
    description: 'React/Next.js frontend development',
    keywords: ['frontend', 'react', 'nextjs', 'hooks', 'components']
  },
  {
    name: 'database-optimization',
    description: 'General SQL database optimization and performance',
    keywords: ['database', 'sql', 'optimization', 'performance', 'indexing']
  },
  {
    name: 'database-athena',
    description: 'AWS Athena and data lake optimization',
    keywords: ['aws', 'athena', 'sql', 'data-lake', 'presto']
  },
  {
    name: 'database-bigquery',
    description: 'GCP BigQuery optimization and analytics',
    keywords: ['gcp', 'bigquery', 'analytics', 'data-warehouse']
  },
  {
    name: 'database-redshift',
    description: 'AWS Redshift optimization and analytics',
    keywords: ['aws', 'redshift', 'analytics', 'data-warehouse']
  },
  {
    name: 'data-engineering',
    description: 'Data engineering workflows (ETL, pipelines, data quality)',
    keywords: ['data-engineering', 'etl', 'pipelines', 'data-quality', 'airflow']
  },
  {
    name: 'python-data',
    description: 'Python data science and FastAPI backend development',
    keywords: ['python', 'data-science', 'pandas', 'fastapi', 'jupyter']
  }
];

export async function available(): Promise<void> {
  console.log(chalk.blue.bold('\n📦 Available ClaudeMesh Domains\n'));

  const spinner = ora('Checking package availability').start();

  try {
    const domains: DomainInfo[] = [];

    // Check each known domain
    for (const domain of KNOWN_DOMAINS) {
      const packageName = `@claudemesh/${domain.name}`;

      try {
        // Check if package exists on npm
        const info = execSync(`npm view ${packageName} version description`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });

        const [version, description] = info.trim().split('\n');

        // Check if already installed locally
        let installed = false;
        try {
          require.resolve(`${packageName}/package.json`, { paths: [process.cwd()] });
          installed = true;
        } catch {
          installed = false;
        }

        domains.push({
          name: domain.name,
          version,
          description: description || domain.description,
          installed
        });
      } catch {
        // Package not found on npm, still show it as coming soon
        domains.push({
          name: domain.name,
          version: 'coming-soon',
          description: domain.description,
          installed: false
        });
      }
    }

    spinner.succeed('Fetched domain information');

    // Display available domains
    if (domains.length === 0) {
      console.log(chalk.yellow('No domains found.\n'));
      return;
    }

    // Group by status
    const installed = domains.filter(d => d.installed);
    const available = domains.filter(d => !d.installed && d.version !== 'coming-soon');
    const comingSoon = domains.filter(d => d.version === 'coming-soon');

    // Show installed domains
    if (installed.length > 0) {
      console.log(chalk.green.bold('✓ Installed:\n'));
      for (const domain of installed) {
        console.log(chalk.cyan(`  ${domain.name}`) + chalk.gray(` v${domain.version}`));
        console.log(chalk.gray(`    ${domain.description}`));
        console.log();
      }
    }

    // Show available domains
    if (available.length > 0) {
      console.log(chalk.blue.bold('↓ Available to install:\n'));
      for (const domain of available) {
        console.log(chalk.cyan(`  ${domain.name}`) + chalk.gray(` v${domain.version}`));
        console.log(chalk.gray(`    ${domain.description}`));
        console.log(chalk.gray(`    Install: `) + chalk.cyan(`ccmesh add ${domain.name}`));
        console.log();
      }
    }

    // Show coming soon domains
    if (comingSoon.length > 0) {
      console.log(chalk.yellow.bold('🔜 Coming Soon:\n'));
      for (const domain of comingSoon) {
        console.log(chalk.cyan(`  ${domain.name}`));
        console.log(chalk.gray(`    ${domain.description}`));
        console.log();
      }
    }

    // Summary
    console.log(chalk.blue('─────────────────────────────────────'));
    console.log(chalk.gray(`Total: ${installed.length} installed, ${available.length} available, ${comingSoon.length} coming soon`));

    if (available.length > 0) {
      console.log();
      console.log(chalk.gray('Install a domain:'));
      console.log(chalk.cyan(`  ccmesh add <domain>`));
    }
    console.log();

  } catch (error) {
    spinner.fail('Failed to fetch domain information');
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : 'Unknown error');

    // Fallback: show hardcoded list without npm check
    console.log(chalk.yellow('\n💡 Showing known domains without npm check:\n'));

    for (const domain of KNOWN_DOMAINS) {
      console.log(chalk.cyan(`  ${domain.name}`));
      console.log(chalk.gray(`    ${domain.description}`));
      console.log(chalk.gray(`    Install: `) + chalk.cyan(`ccmesh add ${domain.name}`));
      console.log();
    }

    process.exit(1);
  }
}
