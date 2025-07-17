import Logger from '../utils/logger';
import {
  PollingConfig,
  formatPollingStatusMessage,
  POLLING_SUCCESS_MESSAGES
} from './pollingCore';
import {
  WorkspaceConfigProvider,
  PollingProvider,
  getPollingConfigOperation,
  executePollingRefreshOperation,
  shouldPollingBeActiveOperation,
  getPollingIntervalMsOperation
} from './pollingOperations';

/**
 * Singleton service for managing polling lifecycle
 * Follows imperative shell pattern - delegates business logic to operations
 */
export class PollingService {
  private static instance: PollingService;
  private pollingTimer: NodeJS.Timeout | null = null;
  private currentConfig: PollingConfig | null = null;
  private isPollingActive: boolean = false;

  private constructor(
    private workspaceConfigProvider: WorkspaceConfigProvider,
    private pollingProvider: PollingProvider
  ) {}

  public static getInstance(
    workspaceConfigProvider: WorkspaceConfigProvider,
    pollingProvider: PollingProvider
  ): PollingService {
    if (!PollingService.instance) {
      PollingService.instance = new PollingService(workspaceConfigProvider, pollingProvider);
    }
    return PollingService.instance;
  }

  /**
   * Start polling based on current configuration
   */
  public startPolling(): void {
    try {
      // Check if polling should be active
      const activeResult = shouldPollingBeActiveOperation(this.workspaceConfigProvider);
      if (!activeResult.success) {
        Logger.log(`Failed to check polling status: ${activeResult.error.message}`);
        return;
      }

      if (!activeResult.data) {
        Logger.log('Polling is disabled in configuration');
        return;
      }

      // Get current configuration
      const configResult = getPollingConfigOperation(this.workspaceConfigProvider);
      if (!configResult.success) {
        Logger.log(`Failed to get polling configuration: ${configResult.error.message}`);
        return;
      }

      this.currentConfig = configResult.data;
      this.isPollingActive = true;
      
      Logger.log(`${POLLING_SUCCESS_MESSAGES.POLLING_STARTED}: ${formatPollingStatusMessage(this.currentConfig)}`);
      
      // Schedule first poll
      this.scheduleNextPoll();
    } catch (error) {
      Logger.log(`Error starting polling: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop polling and clear timers
   */
  public stopPolling(): void {
    try {
      if (this.pollingTimer) {
        clearTimeout(this.pollingTimer);
        this.pollingTimer = null;
      }
      
      this.isPollingActive = false;
      this.currentConfig = null;
      
      Logger.log(POLLING_SUCCESS_MESSAGES.POLLING_STOPPED);
    } catch (error) {
      Logger.log(`Error stopping polling: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Restart polling with updated configuration
   */
  public restartPolling(): void {
    this.stopPolling();
    this.startPolling();
  }

  /**
   * Check if polling is currently active
   */
  public isActive(): boolean {
    return this.isPollingActive;
  }

  /**
   * Get current polling configuration
   */
  public getCurrentConfig(): PollingConfig | null {
    return this.currentConfig;
  }

  /**
   * Schedule the next poll execution
   */
  private scheduleNextPoll(): void {
    if (!this.isPollingActive || !this.currentConfig) {
      return;
    }

    try {
      const intervalResult = getPollingIntervalMsOperation(this.workspaceConfigProvider);
      if (!intervalResult.success) {
        Logger.log(`Failed to get polling interval: ${intervalResult.error.message}`);
        return;
      }

      this.pollingTimer = setTimeout(async () => {
        await this.executePoll();
        this.scheduleNextPoll(); // Reschedule after execution
      }, intervalResult.data);
    } catch (error) {
      Logger.log(`Error scheduling next poll: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a single poll operation
   */
  private async executePoll(): Promise<void> {
    if (!this.isPollingActive) {
      return;
    }

    try {
      const result = await executePollingRefreshOperation(this.pollingProvider);
      
      if (result.success) {
        Logger.log(`Polling refresh successful: ${result.data}`);
      } else {
        Logger.log(`Polling refresh failed: ${result.error.message}`);
      }
    } catch (error) {
      Logger.log(`Error executing poll: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}