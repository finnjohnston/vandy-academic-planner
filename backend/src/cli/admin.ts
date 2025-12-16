#!/usr/bin/env node
import { Command } from 'commander';
import { createCatalogCommand } from './commands/catalog.command.js';
import { createSemesterCommand } from './commands/semester.command.js';
import { createCleanupCommand } from './commands/cleanup.command.js';
import { createLinkCommand } from './commands/link.command.js';
import { createValidateCommand } from './commands/validate.command.js';
import { createSeedCommand } from './commands/seed.command.js';

/**
 * Vanderbilt Academic Planner - Admin CLI
 *
 * This CLI provides administrative commands for managing the academic planner,
 * including scraping course catalogs, semester data, and other maintenance tasks.
 */

const program = new Command();

program
  .name('admin')
  .description('Vanderbilt Academic Planner - Admin CLI for data ingestion and management')
  .version('1.0.0');

// Register commands
program.addCommand(createCatalogCommand());
program.addCommand(createSemesterCommand());
program.addCommand(createLinkCommand());
program.addCommand(createValidateCommand());
program.addCommand(createCleanupCommand());
program.addCommand(createSeedCommand());

// Parse command line arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
