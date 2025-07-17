import * as vscode from 'vscode';
import { PollingProvider, Result } from './pollingOperations';
import { 
  executeRefreshDataCommandOperation,
  FileFocusServiceProvider as RefreshDataFileFocusServiceProvider,
  VSCodeProvider as RefreshDataVSCodeProvider
} from '../commands/refresh-data/refreshDataOperations';

/**
 * Implementation of PollingProvider that wraps the existing refresh command
 * This allows polling to reuse the exact same logic as the manual refresh command
 */
export class RefreshDataPollingProvider implements PollingProvider {
  constructor(
    private fileFocusService: RefreshDataFileFocusServiceProvider,
    private vscodeProvider: RefreshDataVSCodeProvider
  ) {}

  /**
   * Execute refresh by delegating to the existing refresh command operation
   * This ensures polling uses the exact same logic as the manual command
   */
  async executeRefresh(): Promise<Result<string>> {
    return await executeRefreshDataCommandOperation(
      this.fileFocusService,
      this.vscodeProvider
    );
  }
}

/**
 * Factory function to create a PollingProvider instance
 * This follows the same pattern as other provider factories in the codebase
 */
export const createRefreshDataPollingProvider = (
  fileFocusService: RefreshDataFileFocusServiceProvider,
  vscodeProvider: RefreshDataVSCodeProvider
): PollingProvider => {
  return new RefreshDataPollingProvider(fileFocusService, vscodeProvider);
};