#!/usr/bin/env node
import { Command } from 'commander';
import { createCatalogCommand } from './commands/catalog.command.js';

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

// Future commands can be added here:
// program.addCommand(createSemesterCommand());
// program.addCommand(createCleanupCommand());
// program.addCommand(createMigrateCommand());

// Parse command line arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
