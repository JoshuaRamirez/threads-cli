/**
 * Unit tests for commands/set.ts
 */

import { Thread, Entity } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module to return our mock storage
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatStatus: jest.fn((s: string) => `[${s}]`),
  formatTemperature: jest.fn((t: string) => `{${t}}`),
  formatSize: jest.fn((s: string) => `(${s})`),
  formatImportance: jest.fn((i: number) => `!${i}`),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
}));

import { setCommand } from '../src/commands/set';

describe('setCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('set_ThreadNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await setCommand.parseAsync(['node', 'test', 'nonexistent', 'status', 'active']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('set_Status_UpdatesStatus', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'status', 'paused']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', { status: 'paused' });
  });

  test('set_InvalidStatus_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'status', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid status'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('set_Temperature_UpdatesTemperature', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'temperature', 'hot']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', { temperature: 'hot' });
  });

  test('set_Temp_AliasWorks', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'temp', 'cold']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', { temperature: 'cold' });
  });

  test('set_InvalidTemperature_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'temperature', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid temperature'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('set_Size_UpdatesSize', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'size', 'huge']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', { size: 'huge' });
  });

  test('set_InvalidSize_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'size', 'invalid']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid size'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('set_Importance_UpdatesImportance', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'importance', '5']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', { importance: 5 });
  });

  test('set_ImportanceOutOfRange_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'importance', '10']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('between 1 and 5'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('set_Name_UpdatesName', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'name', 'New Name']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', { name: 'New Name' });
  });

  test('set_Description_UpdatesDescription', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'description', 'New desc']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', { description: 'New desc' });
  });

  test('set_Parent_UpdatesParentId', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    const parent = createMockThread({ id: 'parent-1', name: 'Parent Thread' });
    mockStorage.getThreadById.mockReturnValue(thread);
    mockStorage.getAllEntities.mockReturnValue([thread, parent]);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'parent', 'parent-1']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', expect.objectContaining({
      parentId: 'parent-1',
    }));
  });

  test('set_ParentNone_ClearsParent', async () => {
    const thread = createMockThread({ id: 'thread-1', parentId: 'old-parent' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'parent', 'none']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('thread-1', { parentId: null });
  });

  test('set_ParentSelf_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);
    mockStorage.getAllEntities.mockReturnValue([thread]);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'parent', 'thread-1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('cannot be its own parent'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('set_ParentNotFound_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);
    mockStorage.getAllEntities.mockReturnValue([thread]);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'parent', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('set_UnknownProperty_LogsError', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'unknown', 'value']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown property'));
    expect(mockStorage.updateThread).not.toHaveBeenCalled();
  });

  test('set_Success_LogsSuccess', async () => {
    const thread = createMockThread({ id: 'thread-1', name: 'My Thread' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await setCommand.parseAsync(['node', 'test', 'thread-1', 'status', 'completed']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Updated'));
  });
});
