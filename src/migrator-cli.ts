import { Command } from 'commander';
import { migrate } from './migrator';

const program = new Command()
  .option('-d, --directory <string>', 'Directory to migrate. Either directory or file should be provided, not both or none.')
  .option('-f, --file <string>', 'Directory to migrate, Either directory or file should be provided, not both or none.')
  .option(
    '-s, --sfc',
    'If you would like to generate a SFC and remove the original scss and ts files',
    false,
  )
  .action((options) => migrate(options))
  .parse(process.argv);

export default program;
