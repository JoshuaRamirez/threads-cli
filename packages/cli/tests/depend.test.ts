/**
 * Unit tests for commands/depend.ts
 */

import { Thread } from 'threads-types';

// Mock storage module
jest.mock('threads-storage', () => ({
  getThreadById: jest.fn(),
  getThreadByName: jest.fn(),
  getAllThreads: jest.fn(),
  updateThread: jest.fn(),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
}));

import {
  getThreadById,
  getThreadByName,
  getAllThreads,
  updateThread,
} from 'threads-storage';
import { dependCommand } from '../src/commands/depend';

const mockGetThreadById = getThreadById as jest.MockedFunction<typeof getThreadById>;
const mockGetThreadByName = getThreadByName as jest.MockedFunction<typeof getThreadByName>;
const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockUpdateThread = updateThread as jest.MockedFunction<typeof updateThread>;

function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'test-id-123',
    name: 'Test Thread',
    description: '',
    status: 'active',
    importance: 3,
    temperature: 'warm',
    size: 'medium',
    parentId: null,
    groupId: null,
    tags: [],
    dependencies: [],
    progress: [],
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('dependCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('depend_NoOnOption_LogsError', async () => {
    await dependCommand.parseAsync(['node', 'test', 'thread1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Must specify --on'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('depend_SourceNotFound_LogsError', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);

    await dependCommand.parseAsync(['node', 'test', 'nonexistent', '--on', 'target']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('depend_TargetNotFound_LogsError', async () => {
    const source = createMockThread({ id: 'src-1', name: 'Source' });
    mockGetThreadById.mockImplementation((id) => id === 'src-1' ? source : undefined);
    mockGetThreadByName.mockImplementation((name) => name === 'Source' ? source : undefined);
    mockGetAllThreads.mockReturnValue([source]);

    await dependCommand.parseAsync(['node', 'test', 'src-1', '--on', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Target thread'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('depend_SelfDependency_LogsError', async () => {
    const thread = createMockThread({ id: 't1', name: 'Thread' });
    mockGetThreadById.mockReturnValue(thread);

    await dependCommand.parseAsync(['node', 'test', 't1', '--on', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('cannot depend on itself'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('depend_AddDependency_AddsToDependencies', async () => {
    const source = createMockThread({ id: 'src-1', name: 'Source', dependencies: [] });
    const target = createMockThread({ id: 'tgt-1', name: 'Target' });
    mockGetThreadById.mockImplementation((id) => {
      if (id === 'src-1') return source;
      if (id === 'tgt-1') return target;
      return undefined;
    });

    await dependCommand.parseAsync(['node', 'test', 'src-1', '--on', 'tgt-1']);

    expect(mockUpdateThread).toHaveBeenCalledWith('src-1', {
      dependencies: expect.arrayContaining([
        expect.objectContaining({ threadId: 'tgt-1' }),
      ]),
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Added dependency'));
  });

  test('depend_WithContext_StoresContext', async () => {
    const source = createMockThread({ id: 'src-1', name: 'Source', dependencies: [] });
    const target = createMockThread({ id: 'tgt-1', name: 'Target' });
    mockGetThreadById.mockImplementation((id) => {
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

    expect(mockUpdateThread).toHaveBeenCalledWith('src-1', {
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
    mockGetThreadById.mockImplementation((id) => {
      if (id === 'src-1') return source;
      if (id === 'tgt-1') return target;
      return undefined;
    });

    await dependCommand.parseAsync(['node', 'test', 'src-1', '--on', 'tgt-1', '--why', 'New reason']);

    expect(mockUpdateThread).toHaveBeenCalledWith('src-1', {
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
    mockGetThreadById.mockImplementation((id) => {
      if (id === 'src-1') return source;
      if (id === 'tgt-1') return target;
      return undefined;
    });

    await dependCommand.parseAsync(['node', 'test', 'src-1', '--on', 'tgt-1', '--remove']);

    expect(mockUpdateThread).toHaveBeenCalledWith('src-1', { dependencies: [] });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Removed dependency'));
  });

  test('depend_RemoveNonexistent_LogsWarning', async () => {
    const source = createMockThread({ id: 'src-1', name: 'Source', dependencies: [] });
    const target = createMockThread({ id: 'tgt-1', name: 'Target' });
    mockGetThreadById.mockImplementation((id) => {
      if (id === 'src-1') return source;
      if (id === 'tgt-1') return target;
      return undefined;
    });

    await dependCommand.parseAsync(['node', 'test', 'src-1', '--on', 'tgt-1', '--remove']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('does not depend on'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('depend_ByPartialId_FindsThread', async () => {
    const source = createMockThread({ id: 'abc123-source', name: 'Source', dependencies: [] });
    const target = createMockThread({ id: 'xyz789-target', name: 'Target' });
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([source, target]);

    await dependCommand.parseAsync(['node', 'test', 'abc', '--on', 'xyz']);

    expect(mockUpdateThread).toHaveBeenCalled();
  });
});
