/**
 * Unit tests for commands/show.ts
 */

import { Thread, Container } from 'threads-types';

// Mock storage module
jest.mock('threads-storage', () => ({
  getThreadById: jest.fn(),
  getThreadByName: jest.fn(),
  getAllThreads: jest.fn(),
  getContainerById: jest.fn(),
  getContainerByName: jest.fn(),
  getAllContainers: jest.fn(),
  isContainer: jest.fn(),
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

import {
  getThreadById,
  getThreadByName,
  getAllThreads,
  getContainerById,
  getContainerByName,
  getAllContainers,
  isContainer,
} from 'threads-storage';
import { formatThreadDetail, formatContainerDetail } from '../src/utils';
import { showCommand } from '../src/commands/show';

const mockGetThreadById = getThreadById as jest.MockedFunction<typeof getThreadById>;
const mockGetThreadByName = getThreadByName as jest.MockedFunction<typeof getThreadByName>;
const mockGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;
const mockGetContainerById = getContainerById as jest.MockedFunction<typeof getContainerById>;
const mockGetContainerByName = getContainerByName as jest.MockedFunction<typeof getContainerByName>;
const mockGetAllContainers = getAllContainers as jest.MockedFunction<typeof getAllContainers>;
const mockIsContainer = isContainer as jest.MockedFunction<typeof isContainer>;
const mockFormatThreadDetail = formatThreadDetail as jest.MockedFunction<typeof formatThreadDetail>;
const mockFormatContainerDetail = formatContainerDetail as jest.MockedFunction<typeof formatContainerDetail>;

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

function createMockContainer(overrides: Partial<Container> = {}): Container {
  return {
    type: 'container',
    id: 'container-123',
    name: 'Test Container',
    description: 'Test description',
    parentId: null,
    groupId: null,
    tags: [],
    details: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('showCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockGetAllThreads.mockReturnValue([]);
    mockGetAllContainers.mockReturnValue([]);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('show_ThreadById_DisplaysThreadDetail', async () => {
    const thread = createMockThread({ id: 'thread-1' });
    mockGetThreadById.mockReturnValue(thread);
    mockIsContainer.mockReturnValue(false);

    await showCommand.parseAsync(['node', 'test', 'thread-1']);

    expect(mockFormatThreadDetail).toHaveBeenCalledWith(thread);
  });

  test('show_ContainerById_DisplaysContainerDetail', async () => {
    const container = createMockContainer({ id: 'container-1' });
    mockGetThreadById.mockReturnValue(undefined);
    mockGetContainerById.mockReturnValue(container);
    mockIsContainer.mockReturnValue(true);

    await showCommand.parseAsync(['node', 'test', 'container-1']);

    expect(mockFormatContainerDetail).toHaveBeenCalledWith(container);
  });

  test('show_NotFound_LogsError', async () => {
    mockGetThreadById.mockReturnValue(undefined);
    mockGetContainerById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetContainerByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([]);
    mockGetAllContainers.mockReturnValue([]);

    await showCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('show_MultipleMatches_LogsAmbiguity', async () => {
    const thread1 = createMockThread({ id: 'abc-1', name: 'ABC Thread' });
    const thread2 = createMockThread({ id: 'abc-2', name: 'ABC Another' });

    mockGetThreadById.mockReturnValue(undefined);
    mockGetContainerById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetContainerByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([thread1, thread2]);
    mockGetAllContainers.mockReturnValue([]);
    mockIsContainer.mockReturnValue(false);

    await showCommand.parseAsync(['node', 'test', 'abc']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple entities'));
  });

  test('show_ByName_FindsEntity', async () => {
    const thread = createMockThread({ id: 'thread-1', name: 'My Thread' });
    mockGetThreadById.mockReturnValue(undefined);
    mockGetContainerById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(thread);
    mockIsContainer.mockReturnValue(false);

    await showCommand.parseAsync(['node', 'test', 'My Thread']);

    expect(mockFormatThreadDetail).toHaveBeenCalledWith(thread);
  });

  test('show_ByPartialId_FindsSingleMatch', async () => {
    const thread = createMockThread({ id: 'abc123def456' });
    mockGetThreadById.mockReturnValue(undefined);
    mockGetContainerById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetContainerByName.mockReturnValue(undefined);
    mockGetAllThreads.mockReturnValue([thread]);
    mockGetAllContainers.mockReturnValue([]);
    mockIsContainer.mockReturnValue(false);

    await showCommand.parseAsync(['node', 'test', 'abc']);

    expect(mockFormatThreadDetail).toHaveBeenCalledWith(thread);
  });

  test('show_Container_CallsFormatContainerDetail', async () => {
    const container = createMockContainer({ id: 'c1', name: 'My Container' });
    mockGetThreadById.mockReturnValue(undefined);
    mockGetContainerById.mockReturnValue(undefined);
    mockGetThreadByName.mockReturnValue(undefined);
    mockGetContainerByName.mockReturnValue(container);
    mockIsContainer.mockReturnValue(true);

    await showCommand.parseAsync(['node', 'test', 'My Container']);

    expect(mockFormatContainerDetail).toHaveBeenCalledWith(container);
  });
});
