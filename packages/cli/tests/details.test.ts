/**
 * Unit tests for commands/details.ts
 */

import { Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-details-uuid'),
}));

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
  dim: jest.fn((s: string) => s),
  bold: Object.assign(jest.fn((s: string) => s), {
    underline: jest.fn((s: string) => s),
  }),
}));

import { detailsCommand } from '../src/commands/details';

describe('detailsCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  test('details_ThreadNotFound_LogsError', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([]);

    await detailsCommand.parseAsync(['node', 'test', 'nonexistent']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  test('details_NoDetails_ShowsNoDetails', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread', details: [] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No details set'));
  });

  test('details_WithDetails_ShowsCurrentDetails', async () => {
    const thread = createMockThread({
      id: 't1',
      name: 'My Thread',
      details: [{ id: 'd1', timestamp: '2024-01-01T00:00:00.000Z', content: 'Current details' }],
    });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Current details'));
  });

  test('details_SetContent_AddsDetails', async () => {
    const thread = createMockThread({ id: 't1', details: [] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', 'New details content']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', {
      details: expect.arrayContaining([
        expect.objectContaining({ content: 'New details content' }),
      ]),
    });
  });

  test('details_AppendToExisting_KeepsHistory', async () => {
    const existingDetail = { id: 'd1', timestamp: '2024-01-01T00:00:00.000Z', content: 'Old' };
    const thread = createMockThread({ id: 't1', details: [existingDetail] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', 'New content']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', {
      details: [
        existingDetail,
        expect.objectContaining({ content: 'New content' }),
      ],
    });
  });

  test('details_History_ShowsAllVersions', async () => {
    const thread = createMockThread({
      id: 't1',
      name: 'My Thread',
      details: [
        { id: 'd1', timestamp: '2024-01-01T00:00:00.000Z', content: 'Version 1' },
        { id: 'd2', timestamp: '2024-02-01T00:00:00.000Z', content: 'Version 2' },
        { id: 'd3', timestamp: '2024-03-01T00:00:00.000Z', content: 'Version 3' },
      ],
    });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', '--history']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Details History'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Version 1'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Version 2'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[CURRENT]'));
  });

  test('details_HistoryEmpty_ShowsNoHistory', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread', details: [] });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', '--history']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No details history'));
  });

  test('details_MultipleMatches_ShowsAmbiguity', async () => {
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([
      createMockThread({ id: 'abc-1', name: 'Thread ABC 1' }),
      createMockThread({ id: 'abc-2', name: 'Thread ABC 2' }),
    ]);

    await detailsCommand.parseAsync(['node', 'test', 'abc']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple threads match'));
  });

  test('details_Success_LogsSuccess', async () => {
    const thread = createMockThread({ id: 't1', name: 'My Thread' });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', 'New details']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Details updated'));
  });
});
