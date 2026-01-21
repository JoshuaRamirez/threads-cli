/**
 * Unit tests for commands/set.ts
 */

import { Thread, Entity } from '@joshua2048/threads-core';

// Mock storage module
jest.mock('@joshua2048/threads-storage', () => ({
  getThreadById: jest.fn(),
  getThreadByName: jest.fn(),
  getAllThreads: jest.fn(),
  updateThread: jest.fn(),
  getAllEntities: jest.fn(),
  getEntityById: jest.fn(),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatStatus: jest.fn((s) => `[${s}]`),
  formatTemperature: jest.fn((t) => `{${t}}`),
  formatSize: jest.fn((s) => `(${s})`),
  formatImportance: jest.fn((i) => `!${i}`),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
}));

import {
  getThreadById,
  getThreadByName,
  getAllThreads,
  updateThread,
  getAllEntities,
} from '@joshua2048/threads-storage';
import { setCommand } from '../src/commands/set';

const mockGetThreadById = getThreadById as jest.MockedFunction<typeof getThreadById>;
const mockGetThreadByName = getThreadByName as jest.MockedFunction<typeof getThreadByName>;
const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockUpdateThread = updateThread as jest.MockedFunction<typeof updateThread>;
const mockGetAllEntities = getAllEntities as jest.MockedFunction<typeof getAllEntities>;

function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'test-id-123',
    name: 'Test Thread',
    description: 'Test description',
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

describe('setCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('set_ThreadNotFound_LogsError', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);

    await setCommand.parseAsync(['node', 'test', 'nonexistent', 'status', 'active']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('set_Status_UpdatesStatus', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'status', 'paused']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', { status: 'paused' });
  });

  test('set_InvalidStatus_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'status', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid status'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('set_Temperature_UpdatesTemperature', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'temperature', 'hot']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', { temperature: 'hot' });
  });

  test('set_Temp_AliasWorks', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'temp', 'cold']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', { temperature: 'cold' });
  });

  test('set_InvalidTemperature_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'temperature', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid temperature'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('set_Size_UpdatesSize', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'size', 'huge']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', { size: 'huge' });
  });

  test('set_InvalidSize_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'size', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid size'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('set_Importance_UpdatesImportance', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'importance', '5']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', { importance: 5 });
  });

  test('set_ImportanceOutOfRange_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'importance', '10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('between 1 and 5'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('set_Name_UpdatesName', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'name', 'New Name']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', { name: 'New Name' });
  });

  test('set_Description_UpdatesDescription', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'description', 'New desc']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', { description: 'New desc' });
  });

  test('set_Parent_UpdatesParentId', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    const parent = createMockThread({ id: 'parent-1', name: 'Parent Thread' });
    mockGetThreadById.mockReturnValue(thread);
    mockGetAllEntities.mockReturnValue([thread, parent]);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'parent', 'parent-1']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', expect.objectContaining({
      parentId: 'parent-1',
    }));
  });

  test('set_ParentNone_ClearsParent', async () => {
    const thread = createMockThread({ id: 'thread-1', parentId: 'old-parent' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'parent', 'none']);

    expect(mockUpdateThread).toHaveBeenCalledWith('thread-1', { parentId: null });
  });

  test('set_ParentSelf_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);
    mockGetAllEntities.mockReturnValue([thread]);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'parent', 'thread-1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('cannot be its own parent'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('set_ParentNotFound_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);
    mockGetAllEntities.mockReturnValue([thread]);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'parent', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('set_UnknownProperty_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'unknown', 'value']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown property'));
    expect(mockUpdateThread).not.toHaveBeenCalled();
  });

  test('set_Success_LogsSuccess', async () => {
    const thread = createMockThread({ id: 'thread-1', name: 'My Thread' });
    mockGetThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'status', 'completed']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated'));
  });
});
