/**
 * Unit tests for commands/config.ts
 */

// Mock config module
jest.mock('../src/config', () => ({
  loadConfig: jest.fn(),
  getLabel: jest.fn(),
  setLabel: jest.fn(),
  resetLabels: jest.fn(),
  getConfigFilePath: jest.fn(() => '/path/to/config.json'),
  DEFAULT_LABELS: {
    thread: 'Thread',
    container: 'Container',
    group: 'Group',
  },
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: Object.assign(jest.fn((s: string) => s), {
    underline: jest.fn((s: string) => s),
  }),
}));

import {
  loadConfig,
  getLabel,
  setLabel,
  resetLabels,
} from '../src/config';
import { configCommand } from '../src/commands/config';

const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;
const mockGetLabel = getLabel as jest.MockedFunction<typeof getLabel>;
const mockSetLabel = setLabel as jest.MockedFunction<typeof setLabel>;
const mockResetLabels = resetLabels as jest.MockedFunction<typeof resetLabels>;

describe('configCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('show subcommand', () => {
    test('show_DisplaysCurrentConfig', async () => {
      mockLoadConfig.mockReturnValue({
        labels: {
          thread: 'Thread',
          container: 'Container',
          group: 'Group',
        },
      });

      await configCommand.parseAsync(['node', 'test', 'show']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Labels'));
    });
  });

  describe('get subcommand', () => {
    test('get_ValidKey_ReturnsValue', async () => {
      mockGetLabel.mockReturnValue('CustomThread');

      await configCommand.parseAsync(['node', 'test', 'get', 'label.thread']);

      expect(mockGetLabel).toHaveBeenCalledWith('thread');
      expect(consoleSpy).toHaveBeenCalledWith('CustomThread');
    });

    test('get_EmptyValue_ShowsEmpty', async () => {
      mockGetLabel.mockReturnValue('');

      await configCommand.parseAsync(['node', 'test', 'get', 'label.container']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('empty'));
    });

    test('get_InvalidFormat_LogsError', async () => {
      await configCommand.parseAsync(['node', 'test', 'get', 'invalid']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid key'));
    });

    test('get_InvalidNodeType_LogsError', async () => {
      await configCommand.parseAsync(['node', 'test', 'get', 'label.invalid']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid node type'));
    });
  });

  describe('set subcommand', () => {
    test('set_ValidKeyAndValue_SetsValue', async () => {
      await configCommand.parseAsync(['node', 'test', 'set', 'label.thread', 'CustomThread']);

      expect(mockSetLabel).toHaveBeenCalledWith('thread', 'CustomThread');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Set'));
    });

    test('set_EmptyQuotes_SetsEmptyString', async () => {
      await configCommand.parseAsync(['node', 'test', 'set', 'label.thread', '""']);

      expect(mockSetLabel).toHaveBeenCalledWith('thread', '');
    });

    test('set_InvalidFormat_LogsError', async () => {
      await configCommand.parseAsync(['node', 'test', 'set', 'invalid', 'value']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid key'));
      expect(mockSetLabel).not.toHaveBeenCalled();
    });

    test('set_InvalidNodeType_LogsError', async () => {
      await configCommand.parseAsync(['node', 'test', 'set', 'label.invalid', 'value']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid node type'));
      expect(mockSetLabel).not.toHaveBeenCalled();
    });
  });

  describe('reset subcommand', () => {
    test('reset_ResetsToDefaults', async () => {
      await configCommand.parseAsync(['node', 'test', 'reset']);

      expect(mockResetLabels).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('reset to defaults'));
    });

    test('reset_WithAll_ResetsToDefaults', async () => {
      await configCommand.parseAsync(['node', 'test', 'reset', '--all']);

      expect(mockResetLabels).toHaveBeenCalled();
    });
  });
});
