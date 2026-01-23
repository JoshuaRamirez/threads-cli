/**
 * Unit tests for commands/depend.ts
 */

import { Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module to return our mock storage
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
}));

import { dependCommand } from '../src/commands/depend';

describe('dependCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('depend_NoOnOption_LogsError', async () => {
    await dependCommand.parseAsync(['node', 'test', 'thread1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Must specify --on'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('depend_SourceNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await dependCommand.parseAsync(['node', 'test', 'nonexistent', '--on', 'target']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('depend_TargetNotFound_LogsError', async () => {
    const source = createMockThread({ id: 'src-1', name: 'Source' });
    mockStorage.getThreadById.mockImplementation((id: string) => id === 'src-1' ? source : undefined);
    mockStorage.getThreadByName.mockImplementation((name: string) => name === 'Source' ? source : undefined);
    mockStorage.getAllThreads.mockReturnValue([source]);

    await dependCommand.parseAsync(['node', 'test', 'src-1', '--on', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Target thread'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('depend_SelfDependency_LogsError', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await dependCommand.parseAsync(['node', 'test', 't1', '--on', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('cannot depend on itself'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('depend_AddDependency_AddsToDependencies', async () => {
    const source = createMockThread({ id: 'src-1', name: 'Source', dependencies: [] });
    const target = createMockThread({ id: 'tgt-1', name: 'Target' });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src-1') return source;
      if (id === 'tgt-1') return target;
      return undefined;
    });

    await dependCommand.parseAsync(['node', 'test', 'src-1', '--on', 'tgt-1']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('src-1', {
      dependencies: expect.arrayContaining([
        expect.objectContaining({ threadId: 'tgt-1' }),
      ]),
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Added dependency'));
  });

  test('depend_WithContext_StoresContext', async () => {
    const source = createMockThread({ id: 'src-1', name: 'Source', dependencies: [] });
    const target = createMockThread({ id: 'tgt-1', name: 'Target' });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src-1') return source;
      if (id === 'tgt-1') return target;
      return undefined;
    });

    await dependCommand.parseAsync([
      'node', 'test', 'src-1', '--on', 'tgt-1',
      '--why', 'Need API',
      '--what', 'Endpoint data',
      '--how', 'REST call',
      '--when', 'Before launch',
    ]);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('src-1', {
      dependencies: expect.arrayContaining([
        expect.objectContaining({
          threadId: 'tgt-1',
          why: 'Need API',
          what: 'Endpoint data',
          how: 'REST call',
          when: 'Before launch',
        }),
      ]),
    });
  });

  test('depend_UpdateExisting_UpdatesContext', async () => {
    const source = createMockThread({
      id: 'src-1',
      name: 'Source',
      dependencies: [{ threadId: 'tgt-1', why: 'Old', what: '', how: '', when: '' }],
    });
    const target = createMockThread({ id: 'tgt-1', name: 'Target' });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src-1') return source;
      if (id === 'tgt-1') return target;
      return undefined;
    });

    await dependCommand.parseAsync(['node', 'test', 'src-1', '--on', 'tgt-1', '--why', 'New reason']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('src-1', {
      dependencies: expect.arrayContaining([
        expect.objectContaining({ threadId: 'tgt-1', why: 'New reason' }),
      ]),
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated dependency'));
  });

  test('depend_Remove_RemovesDependency', async () => {
    const source = createMockThread({
      id: 'src-1',
      name: 'Source',
      dependencies: [{ threadId: 'tgt-1', why: '', what: '', how: '', when: '' }],
    });
    const target = createMockThread({ id: 'tgt-1', name: 'Target' });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src-1') return source;
      if (id === 'tgt-1') return target;
      return undefined;
    });

    await dependCommand.parseAsync(['node', 'test', 'src-1', '--on', 'tgt-1', '--remove']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('src-1', { dependencies: [] });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Removed dependency'));
  });

  test('depend_RemoveNonexistent_LogsWarning', async () => {
    const source = createMockThread({ id: 'src-1', name: 'Source', dependencies: [] });
    const target = createMockThread({ id: 'tgt-1', name: 'Target' });
    mockStorage.getThreadById.mockImplementation((id: string) => {
      if (id === 'src-1') return source;
      if (id === 'tgt-1') return target;
      return undefined;
    });

    await dependCommand.parseAsync(['node', 'test', 'src-1', '--on', 'tgt-1', '--remove']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('does not depend on'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('depend_ByPartialId_FindsThread', async () => {
    const source = createMockThread({ id: 'abc123-source', name: 'Source', dependencies: [] });
    const target = createMockThread({ id: 'xyz789-target', name: 'Target' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([source, target]);

    await dependCommand.parseAsync(['node', 'test', 'abc', '--on', 'xyz']);

    expect(mockStorage.updateThread).toHaveBeenCalled();
  });
});
