import chokidar, { FSWatcher } from 'chokidar';
import { copyFile, mkdir, rename } from 'fs/promises';
import { resolve, parse } from 'path';

import { makeArray } from '#/helpers/array';
import { fileExists, readFromJson, saveToJson } from '#/helpers/files';
import { FactoryLogger, factoryLogger } from '#/services/logger';

interface BackupOptions {
  input?: string;
  output?: string;
  logPath?: string;
  ext?: string[];
}

const defautOptions: BackupOptions = {
  input: '/input',
  output: '/output',
  logPath: './logs',
  ext: ['*'],
};

export class BackupWatcher {
  private watcher: FSWatcher;
  private input: string;
  private output: string;
  private logPath: string;
  private ext: string[];
  private deleted: string;
  private fileConfig: string;
  private log: FactoryLogger;

  constructor(private options?: BackupOptions) {
    this.fileConfig = 'backup-watcher.json';

    if (options) {
      this.configClass(options);
      this.saveConfig({ ...defautOptions, input: this.input, output: this.output, logPath: this.logPath });
    } else {
      this.loadConfig();
    }
  }

  private loadConfig() {
    if (!fileExists(this.fileConfig)) this.saveConfig({ ...defautOptions });
    const config = { ...defautOptions, ...readFromJson<BackupOptions>(this.fileConfig) };
    this.configClass(config);
    this.log = factoryLogger(this.logPath);
  }

  private saveConfig(config: Partial<BackupOptions>) {
    saveToJson(this.fileConfig, { ...config });
  }

  private configClass({ ext = [], input, logPath, output }: BackupOptions) {
    this.input = resolve(input);
    this.output = resolve(output);
    this.logPath = resolve(logPath);
    this.ext = makeArray(ext);
    this.deleted = resolve(this.output, 'deleted');
  }

  private async createFolder(path: string) {
    const dest = resolve(path.replace(this.input, this.output));
    await mkdir(dest, { recursive: true });
    return true;
  }

  private async copyRecursive(path: string) {
    const { base, dir } = parse(path);
    const inputDir = resolve(dir);
    const outputDir = resolve(inputDir.replace(this.input, this.output));
    const outputFile = resolve(outputDir, base);
    await this.createFolder(outputDir);
    await copyFile(path, outputFile);
    return true;
  }

  private async moveToDeleted(inputFile: string) {
    const { base, dir } = parse(inputFile);
    const inputDir = resolve(dir);
    const outputDir = resolve(inputDir.replace(this.input, this.output));
    const outputFile = resolve(outputDir, base);
    if (fileExists(outputFile)) {
      const deletedDir = outputDir.replace(this.output, this.deleted);
      await this.createFolder(deletedDir);
      const deletedFile = resolve(deletedDir, base);
      await rename(outputFile, deletedFile);
      return deletedFile;
    }
    return null;
  }

  async start() {
    const watchArr = this.ext.map(ext => resolve(`${this.input}/**/*.${ext || '*'}`));
    this.watcher = chokidar.watch(watchArr, {
      ignoreInitial: true,
      awaitWriteFinish: { pollInterval: 100, stabilityThreshold: 2000 },
      followSymlinks: false,
      usePolling: true
    });

    this.watcher.on('ready', () => {
      this.log.logging(`READY input=${this.input} output=${this.output} log=${this.logPath}\n`);
    });

    this.watcher.on('add', (path, _stats) => {
      this.copyRecursive(path).then(() => {
        this.log.logging(`BACKUP ADD "${path}"`);
      });
    });

    this.watcher.on('change', (path, _stats) => {
      this.copyRecursive(path).then(() => {
        this.log.logging(`BACKUP CHANGE "${path}"`);
      });
    });

    this.watcher.on('unlink', path => {
      this.moveToDeleted(path).then(deletedFile => {
        if (deletedFile) this.log.deletedLogger.info(`BACKUP DELETADO "${path}" "${deletedFile}"`);
        else this.log.logging(`NOT_EXISTS "${path}"`);
      });
    });

    // this.watcher.on('all', (eventName, path, stats) => {
    //   //   console.log(eventName, path, stats);
    // });

    process.on('SIGTERM', () => {
      this.log.logging(`STOP SIGTERM`);
    });

    process.on('SIGINT', () => {
      this.log.logging(`STOP SIGINT`);
    });
  }
}
