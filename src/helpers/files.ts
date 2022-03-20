import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export function saveToJson<T = any>(fileName: string, config: T) {
  const filePath = resolve(fileName);
  writeFileSync(filePath, JSON.stringify(config), { encoding: 'utf-8' });
}

export function readFromJson<T>(fileName: string): T {
  const file = resolve(fileName);
  const hasFile = existsSync(file);
  if (hasFile) {
    const rawdata = readFileSync(file, { encoding: 'utf-8' });
    return JSON.parse(rawdata);
  }
  return null;
}

export function fileExists(filePath: string) {
  try {
    return !!existsSync(filePath);
  } catch (err) {
    return false;
  }
}
