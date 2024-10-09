import { OptionParser } from '../migrator/option';

describe('OptionParser', () => {
  describe('when options are not provided', () => {
    it('should throw an error', () => {
      expect(() => new OptionParser({}).parse()).toThrowError('Either directory or file should be provided. Not both or none');
    });
  });

  describe('when both directory and file are provided', () => {
    it('should throw an error', () => {
      expect(() => new OptionParser({ directory: 'dir', file: 'file' }).parse()).toThrowError('Either directory or file should be provided. Not both or none');
    });
  });

  describe('when directory is provided', () => {
    it('should return directory mode option', () => {
      const options = new OptionParser({ directory: '/home/auto-test', sfc: true }).parse();
      expect(options).toStrictEqual({ directory: '/home/auto-test', sfc: true });
    });
  });

  describe('when file is provided', () => {
    it('should return file mode option', () => {
      const options = new OptionParser({ file: '/home/auto-test/InputNumber.vue', sfc: false }).parse();
      expect(options).toStrictEqual({ file: '/home/auto-test/InputNumber.vue', sfc: false });
    });
  });
});
