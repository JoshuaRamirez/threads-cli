/**
 * Extended tests for details command - covering uncovered lines
 */

import { Thread } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-detail-uuid'),
}));

// Create mock storage instance
let mockStorage: MockStorageService;

// Mock context module
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  bold: Object.assign(jest.fn((s: string) => s), {
    underline: jest.fn((s: string) => s),
  }),
}));

import { detailsCommand } from '../src/commands/details';

describe('detailsCommand extended', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorageService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('details_MultipleIdMatches_ShowsOptions', async () => {
    // Set up multiple threads with similar IDs
    const threads = [
      createMockThread({ id: 'thread-abc-1', name: 'Thread 1' }),
      createMockThread({ id: 'thread-abc-2', name: 'Thread 2' }),
    ];
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue(threads);

    await detailsCommand.parseAsync(['node', 'test', 'thread-abc']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple threads match'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Thread 1'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Thread 2'));
  });

  test('details_MultipleNameMatches_ShowsOptions', async () => {
    // Set up multiple threads with similar names
    const threads = [
      createMockThread({ id: 'id-1', name: 'Feature Development' }),
      createMockThread({ id: 'id-2', name: 'Feature Testing' }),
    ];
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue(threads);

    await detailsCommand.parseAsync(['node', 'test', 'Feature']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple threads match'));
  });

  test('details_ByPartialId_FindsSingleMatch', async () => {
    const thread = createMockThread({
      id: 'unique-thread-id-123',
      name: 'Test Thread',
      details: [{ id: 'd1', timestamp: '2024-01-01T00:00:00Z', content: 'Test content' }],
    });
    mockStorage.getThreadById.mockReturnValue(undefined);
    mockStorage.getThreadByName.mockReturnValue(undefined);
    mockStorage.getAllThreads.mockReturnValue([thread]);

    await detailsCommand.parseAsync(['node', 'test', 'unique']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test content'));
  });

  test('details_History_ShowsAllVersions', async () => {
    const thread = createMockThread({
      id: 't1',
      name: 'Test Thread',
      details: [
        { id: 'd1', timestamp: '2024-01-01T00:00:00Z', content: 'Version 1 content' },
        { id: 'd2', timestamp: '2024-02-01T00:00:00Z', content: 'Version 2 content' },
        { id: 'd3', timestamp: '2024-03-01T00:00:00Z', content: 'Current content' },
      ],
    });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', '--history']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Details History'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[CURRENT]'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[v1]'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Version 1 content'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Current content'));
  });

  test('details_MultilineContent_RendersCorrectly', async () => {
    const thread = createMockThread({
      id: 't1',
      name: 'Test Thread',
      details: [{
        id: 'd1',
        timestamp: '2024-01-01T00:00:00Z',
        content: 'Line 1\nLine 2\nLine 3',
      }],
    });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1']);

    // Each line should be indented
    expect(consoleSpy).toHaveBeenCalledWith('  Line 1');
    expect(consoleSpy).toHaveBeenCalledWith('  Line 2');
    expect(consoleSpy).toHaveBeenCalledWith('  Line 3');
  });

  test('details_SetWithContent_CreatesEntry', async () => {
    const thread = createMockThread({
      id: 't1',
      name: 'Test Thread',
      details: [],
    });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', 'New details content']);

    expect(mockStorage.updateThread).toHaveBeenCalledWith('t1', {
      details: expect.arrayContaining([
        expect.objectContaining({ content: 'New details content' }),
      ]),
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Details updated'));
  });

  test('details_HistoryEmpty_ShowsMessage', async () => {
    const thread = createMockThread({
      id: 't1',
      name: 'Test Thread',
      details: [],
    });
    mockStorage.getThreadById.mockReturnValue(thread);

    await detailsCommand.parseAsync(['node', 'test', 't1', '--history']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No details history'));
  });
});
