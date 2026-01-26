import { Thread } from '@redjay/threads-core';
import { findMatches, searchThread, MatchContext, SearchScope } from '../src/commands/search';

// Factory for creating mock threads with controlled data
function createMockThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'test-thread-id-12345678',
    name: 'Default Thread Name',
    description: 'Default description',
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
    links: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('findMatches', () => {
  describe('findMatches_SearchText_ReturnsMatchAtCorrectPosition', () => {
    it('should return match with correct start index', () => {
      // Arrange
      const text = 'Hello World';
      const pattern = 'World';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result[0].matchStart).toBe(6);
    });
  });

  describe('findMatches_SearchText_ReturnsMatchWithCorrectEndPosition', () => {
    it('should return match with correct end index', () => {
      // Arrange
      const text = 'Hello World';
      const pattern = 'World';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result[0].matchEnd).toBe(11);
    });
  });

  describe('findMatches_SearchText_ReturnsOriginalTextInContext', () => {
    it('should preserve original text in match context', () => {
      // Arrange
      const text = 'Hello World';
      const pattern = 'World';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result[0].text).toBe('Hello World');
    });
  });

  describe('findMatches_SearchText_ReturnsScopeInContext', () => {
    it('should include scope in match context', () => {
      // Arrange
      const text = 'Hello World';
      const pattern = 'World';
      const scope: SearchScope = 'progress';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result[0].scope).toBe('progress');
    });
  });

  describe('findMatches_NoMatch_ReturnsEmptyArray', () => {
    it('should return empty array when pattern not found', () => {
      // Arrange
      const text = 'Hello World';
      const pattern = 'Foo';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findMatches_MultipleOccurrences_ReturnsAllMatches', () => {
    it('should return correct count for multiple occurrences', () => {
      // Arrange
      const text = 'foo bar foo baz foo';
      const pattern = 'foo';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  describe('findMatches_MultipleOccurrences_ReturnsCorrectFirstPosition', () => {
    it('should return correct position for first occurrence', () => {
      // Arrange
      const text = 'foo bar foo baz foo';
      const pattern = 'foo';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result[0].matchStart).toBe(0);
    });
  });

  describe('findMatches_MultipleOccurrences_ReturnsCorrectSecondPosition', () => {
    it('should return correct position for second occurrence', () => {
      // Arrange
      const text = 'foo bar foo baz foo';
      const pattern = 'foo';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result[1].matchStart).toBe(8);
    });
  });

  describe('findMatches_MultipleOccurrences_ReturnsCorrectThirdPosition', () => {
    it('should return correct position for third occurrence', () => {
      // Arrange
      const text = 'foo bar foo baz foo';
      const pattern = 'foo';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result[2].matchStart).toBe(16);
    });
  });

  describe('findMatches_CaseInsensitive_FindsLowercaseMatch', () => {
    it('should find lowercase when searching with uppercase pattern', () => {
      // Arrange
      const text = 'hello world';
      const pattern = 'HELLO';
      const scope: SearchScope = 'name';
      const caseSensitive = false;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('findMatches_CaseInsensitive_FindsUppercaseMatch', () => {
    it('should find uppercase when searching with lowercase pattern', () => {
      // Arrange
      const text = 'HELLO WORLD';
      const pattern = 'hello';
      const scope: SearchScope = 'name';
      const caseSensitive = false;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('findMatches_CaseInsensitive_FindsMixedCaseMatch', () => {
    it('should find mixed case when searching case-insensitively', () => {
      // Arrange
      const text = 'HeLLo WoRLd';
      const pattern = 'hello';
      const scope: SearchScope = 'name';
      const caseSensitive = false;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('findMatches_CaseSensitive_DoesNotFindMismatchedCase', () => {
    it('should not find match when case differs and case-sensitive', () => {
      // Arrange
      const text = 'Hello World';
      const pattern = 'HELLO';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findMatches_CaseSensitive_FindsExactCaseMatch', () => {
    it('should find match when case matches exactly', () => {
      // Arrange
      const text = 'Hello World';
      const pattern = 'Hello';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('findMatches_OverlappingMatches_FindsAllOccurrences', () => {
    it('should find overlapping occurrences', () => {
      // Arrange
      const text = 'aaa';
      const pattern = 'aa';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('findMatches_EmptyText_ReturnsEmptyArray', () => {
    it('should return empty array for empty text', () => {
      // Arrange
      const text = '';
      const pattern = 'test';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = findMatches(text, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});

describe('searchThread', () => {
  describe('searchThread_NameScope_FindsMatchInName', () => {
    it('should find match in thread name', () => {
      // Arrange
      const thread = createMockThread({ name: 'Feature Implementation' });
      const pattern = 'Feature';
      const scope: SearchScope = 'name';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('searchThread_NameScope_ReturnsScopeAsName', () => {
    it('should return scope as name for name matches', () => {
      // Arrange
      const thread = createMockThread({ name: 'Feature Implementation' });
      const pattern = 'Feature';
      const scope: SearchScope = 'name';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result[0].scope).toBe('name');
    });
  });

  describe('searchThread_ProgressScope_FindsMatchInProgressNote', () => {
    it('should find match in progress note', () => {
      // Arrange
      const thread = createMockThread({
        progress: [
          { id: 'p1', timestamp: '2025-01-01T00:00:00.000Z', note: 'Completed initial setup' }
        ]
      });
      const pattern = 'setup';
      const scope: SearchScope = 'progress';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('searchThread_ProgressScope_ReturnsScopeAsProgress', () => {
    it('should return scope as progress for progress matches', () => {
      // Arrange
      const thread = createMockThread({
        progress: [
          { id: 'p1', timestamp: '2025-01-01T00:00:00.000Z', note: 'Completed initial setup' }
        ]
      });
      const pattern = 'setup';
      const scope: SearchScope = 'progress';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result[0].scope).toBe('progress');
    });
  });

  describe('searchThread_ProgressScope_FindsMatchesAcrossMultipleEntries', () => {
    it('should find matches in multiple progress entries', () => {
      // Arrange
      const thread = createMockThread({
        progress: [
          { id: 'p1', timestamp: '2025-01-01T00:00:00.000Z', note: 'Fixed bug in module' },
          { id: 'p2', timestamp: '2025-01-02T00:00:00.000Z', note: 'Fixed another bug' }
        ]
      });
      const pattern = 'Fixed';
      const scope: SearchScope = 'progress';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('searchThread_DetailsScope_FindsMatchInDetailsContent', () => {
    it('should find match in details content', () => {
      // Arrange
      const thread = createMockThread({
        details: [
          { id: 'd1', timestamp: '2025-01-01T00:00:00.000Z', content: 'Architecture design document' }
        ]
      });
      const pattern = 'Architecture';
      const scope: SearchScope = 'details';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('searchThread_DetailsScope_ReturnsScopeAsDetails', () => {
    it('should return scope as details for details matches', () => {
      // Arrange
      const thread = createMockThread({
        details: [
          { id: 'd1', timestamp: '2025-01-01T00:00:00.000Z', content: 'Architecture design document' }
        ]
      });
      const pattern = 'Architecture';
      const scope: SearchScope = 'details';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result[0].scope).toBe('details');
    });
  });

  describe('searchThread_TagsScope_FindsMatchInTag', () => {
    it('should find match in tag', () => {
      // Arrange
      const thread = createMockThread({
        tags: ['backend', 'api', 'refactoring']
      });
      const pattern = 'api';
      const scope: SearchScope = 'tags';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('searchThread_TagsScope_ReturnsScopeAsTags', () => {
    it('should return scope as tags for tag matches', () => {
      // Arrange
      const thread = createMockThread({
        tags: ['backend', 'api', 'refactoring']
      });
      const pattern = 'api';
      const scope: SearchScope = 'tags';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result[0].scope).toBe('tags');
    });
  });

  describe('searchThread_TagsScope_FindsPartialMatchInTag', () => {
    it('should find partial match within tag', () => {
      // Arrange
      const thread = createMockThread({
        tags: ['refactoring']
      });
      const pattern = 'factor';
      const scope: SearchScope = 'tags';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('searchThread_AllScope_FindsMatchInName', () => {
    it('should find name match when scope is all', () => {
      // Arrange
      const thread = createMockThread({ name: 'UniqueNameValue' });
      const pattern = 'UniqueNameValue';
      const scope: SearchScope = 'all';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result.some(m => m.scope === 'name')).toBe(true);
    });
  });

  describe('searchThread_AllScope_FindsMatchInProgress', () => {
    it('should find progress match when scope is all', () => {
      // Arrange
      const thread = createMockThread({
        progress: [
          { id: 'p1', timestamp: '2025-01-01T00:00:00.000Z', note: 'UniqueProgressValue' }
        ]
      });
      const pattern = 'UniqueProgressValue';
      const scope: SearchScope = 'all';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result.some(m => m.scope === 'progress')).toBe(true);
    });
  });

  describe('searchThread_AllScope_FindsMatchInDetails', () => {
    it('should find details match when scope is all', () => {
      // Arrange
      const thread = createMockThread({
        details: [
          { id: 'd1', timestamp: '2025-01-01T00:00:00.000Z', content: 'UniqueDetailsValue' }
        ]
      });
      const pattern = 'UniqueDetailsValue';
      const scope: SearchScope = 'all';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result.some(m => m.scope === 'details')).toBe(true);
    });
  });

  describe('searchThread_AllScope_FindsMatchInTags', () => {
    it('should find tag match when scope is all', () => {
      // Arrange
      const thread = createMockThread({
        tags: ['UniqueTagValue']
      });
      const pattern = 'UniqueTagValue';
      const scope: SearchScope = 'all';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result.some(m => m.scope === 'tags')).toBe(true);
    });
  });

  describe('searchThread_AllScope_FindsMatchesAcrossMultipleScopes', () => {
    it('should find matches in multiple scopes', () => {
      // Arrange
      const thread = createMockThread({
        name: 'Test Feature',
        progress: [
          { id: 'p1', timestamp: '2025-01-01T00:00:00.000Z', note: 'Test progress' }
        ],
        tags: ['test']
      });
      const pattern = 'test';
      const scope: SearchScope = 'all';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  describe('searchThread_NameScope_DoesNotSearchProgress', () => {
    it('should not find progress matches when scope is name', () => {
      // Arrange
      const thread = createMockThread({
        name: 'Something Else',
        progress: [
          { id: 'p1', timestamp: '2025-01-01T00:00:00.000Z', note: 'TargetPattern here' }
        ]
      });
      const pattern = 'TargetPattern';
      const scope: SearchScope = 'name';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('searchThread_ProgressScope_DoesNotSearchName', () => {
    it('should not find name matches when scope is progress', () => {
      // Arrange
      const thread = createMockThread({
        name: 'TargetPattern Feature',
        progress: []
      });
      const pattern = 'TargetPattern';
      const scope: SearchScope = 'progress';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('searchThread_CaseInsensitive_FindsMixedCaseInName', () => {
    it('should find mixed case match case-insensitively', () => {
      // Arrange
      const thread = createMockThread({ name: 'MyFeature Implementation' });
      const pattern = 'MYFEATURE';
      const scope: SearchScope = 'name';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('searchThread_CaseSensitive_DoesNotFindMismatchedCaseInName', () => {
    it('should not find mismatched case when case-sensitive', () => {
      // Arrange
      const thread = createMockThread({ name: 'MyFeature Implementation' });
      const pattern = 'MYFEATURE';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('searchThread_CaseSensitive_FindsExactCaseInName', () => {
    it('should find exact case match when case-sensitive', () => {
      // Arrange
      const thread = createMockThread({ name: 'MyFeature Implementation' });
      const pattern = 'MyFeature';
      const scope: SearchScope = 'name';
      const caseSensitive = true;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('searchThread_NoMatches_ReturnsEmptyArray', () => {
    it('should return empty array when no matches found', () => {
      // Arrange
      const thread = createMockThread({
        name: 'Feature',
        progress: [{ id: 'p1', timestamp: '2025-01-01T00:00:00.000Z', note: 'Progress' }],
        details: [{ id: 'd1', timestamp: '2025-01-01T00:00:00.000Z', content: 'Details' }],
        tags: ['tag1']
      });
      const pattern = 'NonexistentPattern';
      const scope: SearchScope = 'all';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('searchThread_EmptyProgressArray_ReturnsEmptyArray', () => {
    it('should handle empty progress array', () => {
      // Arrange
      const thread = createMockThread({ progress: [] });
      const pattern = 'test';
      const scope: SearchScope = 'progress';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('searchThread_EmptyDetailsArray_ReturnsEmptyArray', () => {
    it('should handle empty details array', () => {
      // Arrange
      const thread = createMockThread({ details: [] });
      const pattern = 'test';
      const scope: SearchScope = 'details';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('searchThread_EmptyTagsArray_ReturnsEmptyArray', () => {
    it('should handle empty tags array', () => {
      // Arrange
      const thread = createMockThread({ tags: [] });
      const pattern = 'test';
      const scope: SearchScope = 'tags';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('searchThread_UndefinedProgress_ReturnsEmptyArray', () => {
    it('should handle undefined progress gracefully', () => {
      // Arrange
      const thread = createMockThread();
      (thread as any).progress = undefined;
      const pattern = 'test';
      const scope: SearchScope = 'progress';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('searchThread_UndefinedDetails_ReturnsEmptyArray', () => {
    it('should handle undefined details gracefully', () => {
      // Arrange
      const thread = createMockThread();
      (thread as any).details = undefined;
      const pattern = 'test';
      const scope: SearchScope = 'details';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('searchThread_UndefinedTags_ReturnsEmptyArray', () => {
    it('should handle undefined tags gracefully', () => {
      // Arrange
      const thread = createMockThread();
      (thread as any).tags = undefined;
      const pattern = 'test';
      const scope: SearchScope = 'tags';
      const caseSensitive = false;

      // Act
      const result = searchThread(thread, pattern, scope, caseSensitive);

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
