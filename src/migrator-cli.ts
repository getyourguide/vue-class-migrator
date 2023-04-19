import { Command } from "commander";
import { migrateDirectory } from "./migrator";

const program = new Command()
  .requiredOption("-d, --directory <string>", "Directory to migrate")
  .option(
    "-s, --sfc",
    "If you would like to generate a SFC and remove the original scss and ts files",
    false,
  )
  .action((options) => migrateDirectory(options.directory, options.sfc))
  .parse(process.argv);

export default program;
