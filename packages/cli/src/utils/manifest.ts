import * as fs from 'fs-extra';
import * as path from 'path';
import { Manifest, ManifestDomain } from '../types';

const MANIFEST_PATH = '.claude/claudemesh.json';

export async function readManifest(): Promise<Manifest> {
  if (await fs.pathExists(MANIFEST_PATH)) {
    return await fs.readJSON(MANIFEST_PATH);
  }

  return {
    version: '1.0.0',
    domains: {},
  };
}

export async function writeManifest(manifest: Manifest): Promise<void> {
  await fs.writeJSON(MANIFEST_PATH, manifest, { spaces: 2 });
}

export async function addDomainToManifest(
  domainName: string,
  version: string,
  agents: string[],
  skills: string[]
): Promise<void> {
  const manifest = await readManifest();

  manifest.domains[domainName] = {
    version,
    agents,
    skills,
  };

  await writeManifest(manifest);
}

export async function removeDomainFromManifest(domainName: string): Promise<void> {
  const manifest = await readManifest();
  delete manifest.domains[domainName];
  await writeManifest(manifest);
}

export async function getDomainInfo(domainName: string): Promise<ManifestDomain | null> {
  const manifest = await readManifest();
  return manifest.domains[domainName] || null;
}

export async function getAllDomains(): Promise<Record<string, ManifestDomain>> {
  const manifest = await readManifest();
  return manifest.domains;
}

export async function initManifest(): Promise<void> {
  const manifest: Manifest = {
    version: '1.0.0',
    domains: {},
  };
  await writeManifest(manifest);
}
