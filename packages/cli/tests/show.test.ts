/**
 * Unit tests for commands/show.ts
 */

import { Thread, Container } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, createMockContainer, MockStorageService } from './helpers/mockStorage';

let mockStorage: MockStorageService;

// Mock context module
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock utils
jest.mock('../src/utils', () => ({
  formatThreadDetail: jest.fn(() => 'formatted-thread-detail'),
  formatContainerDetail: jest.fn(() => 'formatted-container-detail'),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  magenta: jest.fn((s: string) => s),
}));

import { formatThreadDetail, formatContainerDetail } from '../src/utils';
import { showCommand } from '../src/commands/show';

const mockFormatThreadDetail = formatThreadDetail as jest.MockedFunction<typeof formatThreadDetail>;
const mockFormatContainerDetail = formatContainerDetail as jest.MockedFunction<typeof formatContainerDetail>;

describe('showCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([]);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('show_ThreadById_DisplaysThreadDetail', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockStorage.getThreadById.mockReturnValue(thread);
    mockStorage.isContainer.mockReturnValue(false);

    await showCommand.parseAsync(['node', 'test', 'thread-1']);

    expect(mockFormatThreadDetail).toHaveBeenCalledWith(thread, 5);
  });

  test('show_ContainerById_DisplaysContainerDetail', async () => {
    const container = createMockContainer({ id: 'container-1' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getContainerById.mockReturnValue(container);
    mockStorage.isContainer.mockReturnValue(true);

    await showCommand.parseAsync(['node', 'test', 'container-1']);

    expect(mockFormatContainerDetail).toHaveBeenCalledWith(container);
  });

  test('show_NotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getContainerByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);
    mockStorage.getAllContainers.mockReturnValue([]);

    await showCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('show_MultipleMatches_LogsAmbiguity', async () => {
    const thread1 = createMockThread({ id: 'abc-1', name: 'ABC Thread' });
    const thread2 = createMockThread({ id: 'abc-2', name: 'ABC Another' });

    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getContainerByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread1, thread2]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.isContainer.mockReturnValue(false);

    await showCommand.parseAsync(['node', 'test', 'abc']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple entities'));
  });

  test('show_ByName_FindsEntity', async () => {
    const thread = createMockThread({ id: 'thread-1', name: 'My Thread' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(thread);
    mockStorage.isContainer.mockReturnValue(false);

    await showCommand.parseAsync(['node', 'test', 'My Thread']);

    expect(mockFormatThreadDetail).toHaveBeenCalledWith(thread, 5);
  });

  test('show_ByPartialId_FindsSingleMatch', async () => {
    const thread = createMockThread({ id: 'abc123def456' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getContainerByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread]);
    mockStorage.getAllContainers.mockReturnValue([]);
    mockStorage.isContainer.mockReturnValue(false);

    await showCommand.parseAsync(['node', 'test', 'abc']);

    expect(mockFormatThreadDetail).toHaveBeenCalledWith(thread, 5);
  });

  test('show_Container_CallsFormatContainerDetail', async () => {
    const container = createMockContainer({ id: 'c1', name: 'My Container' });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getContainerById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getContainerByName.mockReturnValue(container);
    mockStorage.isContainer.mockReturnValue(true);

    await showCommand.parseAsync(['node', 'test', 'My Container']);

    expect(mockFormatContainerDetail).toHaveBeenCalledWith(container);
  });
});
