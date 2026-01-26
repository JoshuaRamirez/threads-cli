/**
 * Unit tests for commands/link.ts
 */

import { Thread, Link } from '@redjay/threads-core';
import { createMockStorageService, createMockThread, MockStorageService } from './helpers/mockStorage';

let mockStorage: MockStorageService;

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'new-link-uuid'),
}));

// Mock context module
jest.mock('../src/context', () => ({
  getStorage: jest.fn(() => mockStorage),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((s: string) => s),
  green: jest.fn((s: string) => s),
  yellow: jest.fn((s: string) => s),
  blue: jest.fn((s: string) => s),
  magenta: jest.fn((s: string) => s),
  gray: jest.fn((s: string) => s),
  dim: jest.fn((s: string) => s),
  bold: jest.fn((s: string) => s),
  white: jest.fn((s: string) => s),
}));

import { linkCommand } from '../src/commands/link';

describe('linkCommand', () => {
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

  describe('add subcommand', () => {
    test('add_ValidLink_AddsLinkToThread', async () => {
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);
      mockStorage.updateThread.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'add', 'Test', 'https://example.com', '-t', 'web']);

      expect(mockStorage.updateThread).toHaveBeenCalledWith(
        'thread-1',
        expect.objectContaining({
          links: [expect.objectContaining({
            uri: 'https://example.com',
            type: 'web',
          })],
        })
      );
    });

    test('add_WithLabel_SetsLabel', async () => {
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);
      mockStorage.updateThread.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'add', 'Test', 'https://example.com', '-t', 'web', '-l', 'Example Site']);

      expect(mockStorage.updateThread).toHaveBeenCalledWith(
        'thread-1',
        expect.objectContaining({
          links: [expect.objectContaining({
            label: 'Example Site',
          })],
        })
      );
    });

    test('add_WithDescription_SetsDescription', async () => {
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);
      mockStorage.updateThread.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'add', 'Test', 'https://example.com', '-t', 'web', '-d', 'A useful resource']);

      expect(mockStorage.updateThread).toHaveBeenCalledWith(
        'thread-1',
        expect.objectContaining({
          links: [expect.objectContaining({
            description: 'A useful resource',
          })],
        })
      );
    });

    test('add_ThreadNotFound_LogsError', async () => {
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(undefined);
      mockStorage.getAllThreads.mockReturnValue([]);

      await linkCommand.parseAsync(['node', 'test', 'add', 'NonExistent', 'https://example.com', '-t', 'web']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(mockStorage.updateThread).not.toHaveBeenCalled();
    });

    test('add_InvalidType_LogsError', async () => {
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'add', 'Test', 'https://example.com', '-t', 'invalid']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid link type'));
      expect(mockStorage.updateThread).not.toHaveBeenCalled();
    });

    test('add_DuplicateUri_LogsWarning', async () => {
      const existingLink: Link = {
        id: 'existing-link',
        uri: 'https://example.com',
        type: 'web',
        addedAt: '2024-01-01T00:00:00.000Z',
      };
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [existingLink] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'add', 'Test', 'https://example.com', '-t', 'web']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
      expect(mockStorage.updateThread).not.toHaveBeenCalled();
    });

    test('add_AllLinkTypes_Valid', async () => {
      const types = ['web', 'file', 'thread', 'custom'];

      for (const type of types) {
        jest.clearAllMocks();
        const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [] });
        mockStorage.getThreadById.mockReturnValue(thread);
        mockStorage.getThreadByName.mockReturnValue(thread);
        mockStorage.updateThread.mockReturnValue(thread);

        await linkCommand.parseAsync(['node', 'test', 'add', 'Test', `test://${type}`, '-t', type]);

        expect(mockStorage.updateThread).toHaveBeenCalledWith(
          'thread-1',
          expect.objectContaining({
            links: [expect.objectContaining({ type })],
          })
        );
      }
    });
  });

  describe('remove subcommand', () => {
    test('remove_ByUri_RemovesLink', async () => {
      const link: Link = {
        id: 'link-1',
        uri: 'https://example.com',
        type: 'web',
        addedAt: '2024-01-01T00:00:00.000Z',
      };
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [link] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);
      mockStorage.updateThread.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'remove', 'Test', 'https://example.com']);

      expect(mockStorage.updateThread).toHaveBeenCalledWith(
        'thread-1',
        expect.objectContaining({ links: [] })
      );
    });

    test('remove_ById_RemovesLink', async () => {
      const link: Link = {
        id: 'link-uuid-123',
        uri: 'https://example.com',
        type: 'web',
        addedAt: '2024-01-01T00:00:00.000Z',
      };
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [link] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);
      mockStorage.updateThread.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'remove', 'Test', 'link-uuid-123']);

      expect(mockStorage.updateThread).toHaveBeenCalledWith(
        'thread-1',
        expect.objectContaining({ links: [] })
      );
    });

    test('remove_ByPartialId_RemovesLink', async () => {
      const link: Link = {
        id: 'link-uuid-123',
        uri: 'https://example.com',
        type: 'web',
        addedAt: '2024-01-01T00:00:00.000Z',
      };
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [link] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);
      mockStorage.updateThread.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'remove', 'Test', 'link-uuid']);

      expect(mockStorage.updateThread).toHaveBeenCalledWith(
        'thread-1',
        expect.objectContaining({ links: [] })
      );
    });

    test('remove_ThreadNotFound_LogsError', async () => {
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(undefined);
      mockStorage.getAllThreads.mockReturnValue([]);

      await linkCommand.parseAsync(['node', 'test', 'remove', 'NonExistent', 'https://example.com']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(mockStorage.updateThread).not.toHaveBeenCalled();
    });

    test('remove_LinkNotFound_LogsError', async () => {
      const existingLink: Link = {
        id: 'existing-link',
        uri: 'https://existing.com',
        type: 'web',
        addedAt: '2024-01-01T00:00:00.000Z',
      };
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [existingLink] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'remove', 'Test', 'https://notfound.com']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(mockStorage.updateThread).not.toHaveBeenCalled();
    });

    test('remove_NoLinks_LogsWarning', async () => {
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'remove', 'Test', 'anything']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No links'));
      expect(mockStorage.updateThread).not.toHaveBeenCalled();
    });
  });

  describe('list subcommand', () => {
    test('list_WithLinks_DisplaysLinks', async () => {
      const links: Link[] = [
        { id: 'link-1', uri: 'https://example.com', type: 'web', addedAt: '2024-01-01T00:00:00.000Z' },
        { id: 'link-2', uri: 'file:///path/to/file', type: 'file', label: 'My File', addedAt: '2024-01-02T00:00:00.000Z' },
      ];
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'list', 'Test']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Links (2)'));
    });

    test('list_NoLinks_DisplaysEmpty', async () => {
      const thread = createMockThread({ id: 'thread-1', name: 'Test', links: [] });
      mockStorage.getThreadById.mockReturnValue(thread);
      mockStorage.getThreadByName.mockReturnValue(thread);

      await linkCommand.parseAsync(['node', 'test', 'list', 'Test']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Links (0)'));
    });

    test('list_ThreadNotFound_LogsError', async () => {
      mockStorage.getThreadById.mockReturnValue(undefined);
      mockStorage.getThreadByName.mockReturnValue(undefined);
      mockStorage.getAllThreads.mockReturnValue([]);

      await linkCommand.parseAsync(['node', 'test', 'list', 'NonExistent']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });
});
