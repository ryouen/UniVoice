/**
 * PipelineStateManager Unit Tests
 */

import { PipelineStateManager, PipelineState } from '../../electron/services/domain/PipelineStateManager';

describe('PipelineStateManager', () => {
  let stateManager: PipelineStateManager;

  beforeEach(() => {
    stateManager = new PipelineStateManager();
  });

  describe('Basic State Management', () => {
    test('should start in idle state', () => {
      expect(stateManager.getState()).toBe('idle');
    });

    test('should transition from idle to starting', () => {
      stateManager.setState('starting', 'test-correlation-id');
      expect(stateManager.getState()).toBe('starting');
      expect(stateManager.getCorrelationId()).toBe('test-correlation-id');
    });

    test('should transition from starting to listening', () => {
      stateManager.setState('starting');
      stateManager.setState('listening');
      expect(stateManager.getState()).toBe('listening');
    });

    test('should throw error on invalid transition', () => {
      expect(() => {
        stateManager.setState('listening'); // idle -> listening is invalid
      }).toThrow('Invalid state transition: idle -> listening');
    });

    test('should record state history', () => {
      stateManager.setState('starting', 'test-id', 'Test reason');
      const history = stateManager.getStateHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        from: 'idle',
        to: 'starting',
        reason: 'Test reason'
      });
    });
  });

  describe('Pause/Resume Functionality', () => {
    test('should pause from listening state', () => {
      stateManager.setState('starting');
      stateManager.setState('listening');
      
      const result = stateManager.pause();
      expect(result).toBe(true);
      expect(stateManager.getState()).toBe('paused');
      expect(stateManager.isPaused()).toBe(true);
    });

    test('should not pause from idle state', () => {
      const result = stateManager.pause();
      expect(result).toBe(false);
      expect(stateManager.getState()).toBe('idle');
    });

    test('should resume from paused state', () => {
      stateManager.setState('starting');
      stateManager.setState('listening');
      stateManager.pause();
      
      const result = stateManager.resume();
      expect(result).toBe(true);
      expect(stateManager.getState()).toBe('listening');
      expect(stateManager.isPaused()).toBe(false);
    });

    test('should not resume from non-paused state', () => {
      const result = stateManager.resume();
      expect(result).toBe(false);
    });
  });

  describe('State Transitions', () => {
    test('should validate all valid transitions', () => {
      const transitions: Array<[PipelineState, PipelineState[]]> = [
        ['idle', ['starting']],
        ['starting', ['listening', 'error', 'idle']],
        ['listening', ['processing', 'stopping', 'error', 'paused']],
        ['processing', ['listening', 'stopping', 'error']],
        ['stopping', ['idle', 'error']],
        ['error', ['idle']],
        ['paused', ['listening', 'stopping', 'idle']]
      ];

      transitions.forEach(([from, toStates]) => {
        toStates.forEach(to => {
          // Reset to test state
          stateManager.reset();
          if (from !== 'idle') {
            // Navigate to the 'from' state through valid transitions
            navigateToState(stateManager, from);
          }
          
          expect(stateManager.canTransitionTo(to)).toBe(true);
        });
      });
    });
  });

  describe('Metrics and Info', () => {
    test('should track uptime correctly', () => {
      const beforeStart = Date.now();
      stateManager.setState('starting');
      
      // Wait a bit
      const uptime = stateManager.getUptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(uptime).toBeLessThan(100); // Should be very quick
    });

    test('should track activity time', () => {
      stateManager.updateActivity();
      const idleTime = stateManager.getIdleTime();
      expect(idleTime).toBeGreaterThanOrEqual(0);
    });

    test('should provide complete state info', () => {
      stateManager.setState('starting', 'test-corr-id');
      const info = stateManager.getStateInfo();
      
      expect(info).toMatchObject({
        state: 'starting',
        correlationId: 'test-corr-id',
        isPaused: false
      });
      expect(info.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reset Functionality', () => {
    test('should reset all state', () => {
      stateManager.setState('starting', 'test-id');
      stateManager.setState('listening');
      stateManager.updateActivity();
      
      stateManager.reset();
      
      expect(stateManager.getState()).toBe('idle');
      expect(stateManager.getCorrelationId()).toBeNull();
      expect(stateManager.getUptime()).toBe(0);
      expect(stateManager.getStateHistory()).toHaveLength(0);
    });
  });

  describe('Correlation ID Management', () => {
    test('should manage correlation ID independently', () => {
      stateManager.setCorrelationId('test-id-1');
      expect(stateManager.getCorrelationId()).toBe('test-id-1');
      
      stateManager.setState('starting'); // Without correlation ID
      expect(stateManager.getCorrelationId()).toBe('test-id-1'); // Should remain
      
      stateManager.setState('listening', 'test-id-2');
      expect(stateManager.getCorrelationId()).toBe('test-id-2');
    });

    test('should clear correlation ID on idle', () => {
      stateManager.setState('starting', 'test-id');
      stateManager.setState('listening');
      stateManager.setState('stopping');
      stateManager.setState('idle');
      
      expect(stateManager.getCorrelationId()).toBeNull();
    });
  });
});

// Helper function to navigate to a specific state
function navigateToState(manager: PipelineStateManager, targetState: PipelineState): void {
  switch (targetState) {
    case 'starting':
      manager.setState('starting');
      break;
    case 'listening':
      manager.setState('starting');
      manager.setState('listening');
      break;
    case 'processing':
      manager.setState('starting');
      manager.setState('listening');
      manager.setState('processing');
      break;
    case 'stopping':
      manager.setState('starting');
      manager.setState('listening');
      manager.setState('stopping');
      break;
    case 'error':
      manager.setState('starting');
      manager.setState('error');
      break;
    case 'paused':
      manager.setState('starting');
      manager.setState('listening');
      manager.pause();
      break;
  }
}