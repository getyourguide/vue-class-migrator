export type CliOptions = {
  directory?: string;
  file?: string;
  sfc?: boolean;
};

export type DirectoryModeOption = {
  directory: string;
  sfc?: boolean;
};

export type FileModeOption = {
  file: string;
  sfc?: boolean;
};

export type OptionMode = DirectoryModeOption | FileModeOption;

export function canBeCliOptions(obj: any): obj is CliOptions {
  return obj && typeof obj === 'object' && (obj.directory || obj.file || obj.sfc);
}

export class OptionParser {
  constructor(private options: CliOptions) {
    if ((!options.directory && !options.file) || (options.directory && options.file)) {
      throw new Error('Either directory or file should be provided. Not both or none');
    }
  }

  parse(): OptionMode {
    if (this.options.directory) {
      return {
        directory: this.options.directory,
        sfc: this.options.sfc,
      };
    }

    return {
      file: this.options.file,
      sfc: this.options.sfc,
    } as FileModeOption;
  }
}
