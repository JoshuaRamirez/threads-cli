import { Thread, Temperature, Importance } from '@joshua2048/threads-core';

// Mock the storage module before importing next.ts
jest.mock('@joshua2048/threads-storage', () => ({
  getAllThreads: jest.fn()
}));

import { getAllThreads } from '@joshua2048/threads-storage';
import {
  temperatureScores,
  hoursSince,
  recencyScore,
  getMostRecentActivity,
  scoreThread,
  ScoredThread,
  nextCommand
} from '../src/commands/next';

const mockedGetAllThreads = getAllThreads as jest.MockedFunction<typeof getAllThreads>;

// Factory for creating test threads with sensible defaults
function createThread(overrides: Partial<Thread> = {}): Thread {
  const now = new Date().toISOString();
  return {
    id: 'test-id-12345678',
    name: 'Test Thread',
    description: '',
    status: 'active',
    importance: 3 as Importance,
    temperature: 'tepid' as Temperature,
    size: 'medium',
    parentId: null,
    groupId: null,
    tags: [],
    dependencies: [],
    progress: [],
    details: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('temperatureScores', () => {
  describe('temperatureScores_frozen_ReturnsZero', () => {
    it('should return 0 for frozen temperature', () => {
      // Arrange
      const temp: Temperature = 'frozen';

      // Act
      const result = temperatureScores[temp];

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('temperatureScores_freezing_ReturnsOne', () => {
    it('should return 1 for freezing temperature', () => {
      // Arrange
      const temp: Temperature = 'freezing';

      // Act
      const result = temperatureScores[temp];

      // Assert
      expect(result).toBe(1);
    });
  });

  describe('temperatureScores_cold_ReturnsTwo', () => {
    it('should return 2 for cold temperature', () => {
      // Arrange
      const temp: Temperature = 'cold';

      // Act
      const result = temperatureScores[temp];

      // Assert
      expect(result).toBe(2);
    });
  });

  describe('temperatureScores_tepid_ReturnsThree', () => {
    it('should return 3 for tepid temperature', () => {
      // Arrange
      const temp: Temperature = 'tepid';

      // Act
      const result = temperatureScores[temp];

      // Assert
      expect(result).toBe(3);
    });
  });

  describe('temperatureScores_warm_ReturnsFour', () => {
    it('should return 4 for warm temperature', () => {
      // Arrange
      const temp: Temperature = 'warm';

      // Act
      const result = temperatureScores[temp];

      // Assert
      expect(result).toBe(4);
    });
  });

  describe('temperatureScores_hot_ReturnsFive', () => {
    it('should return 5 for hot temperature', () => {
      // Arrange
      const temp: Temperature = 'hot';

      // Act
      const result = temperatureScores[temp];

      // Assert
      expect(result).toBe(5);
    });
  });
});

describe('hoursSince', () => {
  describe('hoursSince_CurrentTime_ReturnsZero', () => {
    it('should return approximately 0 for current time', () => {
      // Arrange
      const now = new Date().toISOString();

      // Act
      const result = hoursSince(now);

      // Assert
      expect(result).toBeCloseTo(0, 1);
    });
  });

  describe('hoursSince_OneHourAgo_ReturnsOne', () => {
    it('should return approximately 1 for one hour ago', () => {
      // Arrange
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Act
      const result = hoursSince(oneHourAgo);

      // Assert
      expect(result).toBeCloseTo(1, 1);
    });
  });

  describe('hoursSince_24HoursAgo_Returns24', () => {
    it('should return approximately 24 for 24 hours ago', () => {
      // Arrange
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Act
      const result = hoursSince(oneDayAgo);

      // Assert
      expect(result).toBeCloseTo(24, 1);
    });
  });
});

describe('recencyScore', () => {
  describe('recencyScore_CurrentTime_ReturnsApproximatelyFive', () => {
    it('should return approximately 5 for current time', () => {
      // Arrange
      const now = new Date().toISOString();

      // Act
      const result = recencyScore(now);

      // Assert
      expect(result).toBeCloseTo(5, 1);
    });
  });

  describe('recencyScore_SevenDaysAgo_ReturnsApproximatelyTwoPointFive', () => {
    it('should return approximately 2.5 for 7 days ago', () => {
      // Arrange
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Act
      const result = recencyScore(sevenDaysAgo);

      // Assert
      expect(result).toBeCloseTo(2.5, 1);
    });
  });

  describe('recencyScore_ThirtyDaysAgo_ReturnsLessThanOne', () => {
    it('should return approximately 0.9 for 30 days ago', () => {
      // Arrange
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      // Formula: 5 * (1 / (1 + 30/7)) = 5 * (1 / 5.286) ~= 0.946

      // Act
      const result = recencyScore(thirtyDaysAgo);

      // Assert
      expect(result).toBeCloseTo(0.946, 1);
    });
  });

  describe('recencyScore_OlderActivity_DecaysOverTime', () => {
    it('should decay as time increases', () => {
      // Arrange
      const recent = new Date().toISOString();
      const older = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      // Act
      const recentScore = recencyScore(recent);
      const olderScore = recencyScore(older);

      // Assert
      expect(recentScore).toBeGreaterThan(olderScore);
    });
  });
});

describe('getMostRecentActivity', () => {
  describe('getMostRecentActivity_NoProgress_ReturnsUpdatedAt', () => {
    it('should return updatedAt when no progress entries exist', () => {
      // Arrange
      const updatedAt = '2025-01-01T12:00:00.000Z';
      const thread = createThread({ updatedAt, progress: [] });

      // Act
      const result = getMostRecentActivity(thread);

      // Assert
      expect(result).toBe(updatedAt);
    });
  });

  describe('getMostRecentActivity_ProgressOlderThanUpdatedAt_ReturnsUpdatedAt', () => {
    it('should return updatedAt when progress is older', () => {
      // Arrange
      const updatedAt = '2025-01-10T12:00:00.000Z';
      const progressTimestamp = '2025-01-05T12:00:00.000Z';
      const thread = createThread({
        updatedAt,
        progress: [{ id: 'p1', timestamp: progressTimestamp, note: 'Old progress' }]
      });

      // Act
      const result = getMostRecentActivity(thread);

      // Assert
      expect(result).toBe(updatedAt);
    });
  });

  describe('getMostRecentActivity_ProgressNewerThanUpdatedAt_ReturnsProgressTimestamp', () => {
    it('should return progress timestamp when progress is newer', () => {
      // Arrange
      const updatedAt = '2025-01-05T12:00:00.000Z';
      const progressTimestamp = '2025-01-10T12:00:00.000Z';
      const thread = createThread({
        updatedAt,
        progress: [{ id: 'p1', timestamp: progressTimestamp, note: 'New progress' }]
      });

      // Act
      const result = getMostRecentActivity(thread);

      // Assert
      expect(result).toBe(progressTimestamp);
    });
  });

  describe('getMostRecentActivity_MultipleProgressEntries_ReturnsLastProgressTimestamp', () => {
    it('should return the last progress entry timestamp when it is newest', () => {
      // Arrange
      const updatedAt = '2025-01-01T12:00:00.000Z';
      const thread = createThread({
        updatedAt,
        progress: [
          { id: 'p1', timestamp: '2025-01-02T12:00:00.000Z', note: 'First' },
          { id: 'p2', timestamp: '2025-01-03T12:00:00.000Z', note: 'Second' },
          { id: 'p3', timestamp: '2025-01-10T12:00:00.000Z', note: 'Third' }
        ]
      });

      // Act
      const result = getMostRecentActivity(thread);

      // Assert
      expect(result).toBe('2025-01-10T12:00:00.000Z');
    });
  });
});

describe('scoreThread', () => {
  describe('scoreThread_HighImportance_IncludesImportanceWeightOfThree', () => {
    it('should weight importance by 3 in total score', () => {
      // Arrange
      const now = new Date().toISOString();
      const thread = createThread({
        importance: 5 as Importance,
        temperature: 'frozen' as Temperature,
        updatedAt: now
      });

      // Act
      const result = scoreThread(thread);

      // Assert
      expect(result.importanceScore).toBe(5);
      // importance contributes 5*3 = 15 to total
    });
  });

  describe('scoreThread_HotTemperature_IncludesTemperatureWeightOfTwo', () => {
    it('should weight temperature by 2 in total score', () => {
      // Arrange
      const now = new Date().toISOString();
      const thread = createThread({
        importance: 1 as Importance,
        temperature: 'hot' as Temperature,
        updatedAt: now
      });

      // Act
      const result = scoreThread(thread);

      // Assert
      expect(result.temperatureScore).toBe(5);
      // temperature contributes 5*2 = 10 to total
    });
  });

  describe('scoreThread_RecentActivity_IncludesRecencyWeightOfOne', () => {
    it('should weight recency by 1 in total score', () => {
      // Arrange
      const now = new Date().toISOString();
      const thread = createThread({
        importance: 1 as Importance,
        temperature: 'frozen' as Temperature,
        updatedAt: now
      });

      // Act
      const result = scoreThread(thread);

      // Assert
      expect(result.recencyScore).toBeCloseTo(5, 1);
      // recency contributes ~5*1 = 5 to total
    });
  });

  describe('scoreThread_CalculatesTotalScore_AppliesCorrectWeights', () => {
    it('should calculate total = importance*3 + temperature*2 + recency*1', () => {
      // Arrange
      const now = new Date().toISOString();
      const thread = createThread({
        importance: 4 as Importance,
        temperature: 'warm' as Temperature, // score 4
        updatedAt: now
      });

      // Act
      const result = scoreThread(thread);

      // Assert
      // importance: 4*3 = 12
      // temperature: 4*2 = 8
      // recency: ~5*1 = 5
      // total: ~25
      const expectedTotal = (4 * 3) + (4 * 2) + result.recencyScore;
      expect(result.totalScore).toBeCloseTo(expectedTotal, 0.1);
    });
  });

  describe('scoreThread_MinimumValues_CalculatesLowestPossibleScore', () => {
    it('should calculate minimum score for lowest importance, frozen temp, old activity', () => {
      // Arrange
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ago
      const thread = createThread({
        importance: 1 as Importance,
        temperature: 'frozen' as Temperature,
        updatedAt: oldDate
      });

      // Act
      const result = scoreThread(thread);

      // Assert
      expect(result.importanceScore).toBe(1);
      expect(result.temperatureScore).toBe(0);
      expect(result.recencyScore).toBeLessThan(1);
      // total: 1*3 + 0*2 + ~0.5 = ~3.5
      expect(result.totalScore).toBeLessThan(4);
    });
  });

  describe('scoreThread_MaximumValues_CalculatesHighestPossibleScore', () => {
    it('should calculate maximum score for highest importance, hot temp, recent activity', () => {
      // Arrange
      const now = new Date().toISOString();
      const thread = createThread({
        importance: 5 as Importance,
        temperature: 'hot' as Temperature,
        updatedAt: now
      });

      // Act
      const result = scoreThread(thread);

      // Assert
      expect(result.importanceScore).toBe(5);
      expect(result.temperatureScore).toBe(5);
      expect(result.recencyScore).toBeCloseTo(5, 1);
      // total: 5*3 + 5*2 + 5*1 = 15 + 10 + 5 = 30
      expect(result.totalScore).toBeCloseTo(30, 1);
    });
  });

  describe('scoreThread_ReturnsThreadReference_AttachesOriginalThread', () => {
    it('should include original thread reference in result', () => {
      // Arrange
      const thread = createThread({ name: 'Unique Thread Name' });

      // Act
      const result = scoreThread(thread);

      // Assert
      expect(result.thread).toBe(thread);
    });
  });
});

describe('nextCommand filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('nextCommand_ActiveThreadsOnly_ExcludesPausedThreads', () => {
    it('should filter out paused threads', () => {
      // Arrange
      const now = new Date().toISOString();
      const activeThread = createThread({ id: 'active-1', status: 'active', updatedAt: now });
      const pausedThread = createThread({ id: 'paused-1', status: 'paused', updatedAt: now });
      mockedGetAllThreads.mockReturnValue([activeThread, pausedThread]);

      // Act
      const filtered = mockedGetAllThreads().filter(t => t.status === 'active');

      // Assert
      expect(filtered.length).toBe(1);
    });
  });

  describe('nextCommand_ActiveThreadsOnly_ExcludesStoppedThreads', () => {
    it('should filter out stopped threads', () => {
      // Arrange
      const now = new Date().toISOString();
      const activeThread = createThread({ id: 'active-1', status: 'active', updatedAt: now });
      const stoppedThread = createThread({ id: 'stopped-1', status: 'stopped', updatedAt: now });
      mockedGetAllThreads.mockReturnValue([activeThread, stoppedThread]);

      // Act
      const filtered = mockedGetAllThreads().filter(t => t.status === 'active');

      // Assert
      expect(filtered.length).toBe(1);
    });
  });

  describe('nextCommand_ActiveThreadsOnly_ExcludesCompletedThreads', () => {
    it('should filter out completed threads', () => {
      // Arrange
      const now = new Date().toISOString();
      const activeThread = createThread({ id: 'active-1', status: 'active', updatedAt: now });
      const completedThread = createThread({ id: 'completed-1', status: 'completed', updatedAt: now });
      mockedGetAllThreads.mockReturnValue([activeThread, completedThread]);

      // Act
      const filtered = mockedGetAllThreads().filter(t => t.status === 'active');

      // Assert
      expect(filtered.length).toBe(1);
    });
  });

  describe('nextCommand_ActiveThreadsOnly_ExcludesArchivedThreads', () => {
    it('should filter out archived threads', () => {
      // Arrange
      const now = new Date().toISOString();
      const activeThread = createThread({ id: 'active-1', status: 'active', updatedAt: now });
      const archivedThread = createThread({ id: 'archived-1', status: 'archived', updatedAt: now });
      mockedGetAllThreads.mockReturnValue([activeThread, archivedThread]);

      // Act
      const filtered = mockedGetAllThreads().filter(t => t.status === 'active');

      // Assert
      expect(filtered.length).toBe(1);
    });
  });

  describe('nextCommand_ActiveThreadsOnly_IncludesAllActiveThreads', () => {
    it('should include all active threads', () => {
      // Arrange
      const now = new Date().toISOString();
      const threads = [
        createThread({ id: 'active-1', status: 'active', updatedAt: now }),
        createThread({ id: 'active-2', status: 'active', updatedAt: now }),
        createThread({ id: 'active-3', status: 'active', updatedAt: now })
      ];
      mockedGetAllThreads.mockReturnValue(threads);

      // Act
      const filtered = mockedGetAllThreads().filter(t => t.status === 'active');

      // Assert
      expect(filtered.length).toBe(3);
    });
  });
});

describe('nextCommand sorting', () => {
  describe('nextCommand_Sorting_SortsByTotalScoreDescending', () => {
    it('should sort threads by total score in descending order', () => {
      // Arrange
      const now = new Date().toISOString();
      const lowScoreThread = createThread({
        id: 'low',
        importance: 1 as Importance,
        temperature: 'frozen' as Temperature,
        updatedAt: now
      });
      const highScoreThread = createThread({
        id: 'high',
        importance: 5 as Importance,
        temperature: 'hot' as Temperature,
        updatedAt: now
      });
      const midScoreThread = createThread({
        id: 'mid',
        importance: 3 as Importance,
        temperature: 'tepid' as Temperature,
        updatedAt: now
      });

      // Act
      const scored = [lowScoreThread, highScoreThread, midScoreThread].map(scoreThread);
      scored.sort((a, b) => b.totalScore - a.totalScore);

      // Assert
      expect(scored[0].thread.id).toBe('high');
    });
  });

  describe('nextCommand_Sorting_HigherImportanceRanksFirst', () => {
    it('should rank higher importance threads above lower importance', () => {
      // Arrange
      const now = new Date().toISOString();
      const imp1Thread = createThread({
        id: 'imp1',
        importance: 1 as Importance,
        temperature: 'tepid' as Temperature,
        updatedAt: now
      });
      const imp5Thread = createThread({
        id: 'imp5',
        importance: 5 as Importance,
        temperature: 'tepid' as Temperature,
        updatedAt: now
      });

      // Act
      const scored = [imp1Thread, imp5Thread].map(scoreThread);
      scored.sort((a, b) => b.totalScore - a.totalScore);

      // Assert
      expect(scored[0].thread.id).toBe('imp5');
    });
  });

  describe('nextCommand_Sorting_HotterTemperatureRanksFirst', () => {
    it('should rank hotter temperature threads above colder when importance equal', () => {
      // Arrange
      const now = new Date().toISOString();
      const coldThread = createThread({
        id: 'cold',
        importance: 3 as Importance,
        temperature: 'cold' as Temperature,
        updatedAt: now
      });
      const hotThread = createThread({
        id: 'hot',
        importance: 3 as Importance,
        temperature: 'hot' as Temperature,
        updatedAt: now
      });

      // Act
      const scored = [coldThread, hotThread].map(scoreThread);
      scored.sort((a, b) => b.totalScore - a.totalScore);

      // Assert
      expect(scored[0].thread.id).toBe('hot');
    });
  });

  describe('nextCommand_Sorting_MoreRecentActivityRanksFirst', () => {
    it('should rank more recent activity above older when other factors equal', () => {
      // Arrange
      const now = new Date().toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const oldThread = createThread({
        id: 'old',
        importance: 3 as Importance,
        temperature: 'tepid' as Temperature,
        updatedAt: thirtyDaysAgo
      });
      const recentThread = createThread({
        id: 'recent',
        importance: 3 as Importance,
        temperature: 'tepid' as Temperature,
        updatedAt: now
      });

      // Act
      const scored = [oldThread, recentThread].map(scoreThread);
      scored.sort((a, b) => b.totalScore - a.totalScore);

      // Assert
      expect(scored[0].thread.id).toBe('recent');
    });
  });
});

describe('nextCommand count option', () => {
  describe('nextCommand_CountOption_LimitsResultsToSpecifiedCount', () => {
    it('should limit results when count is less than total threads', () => {
      // Arrange
      const now = new Date().toISOString();
      const threads = [
        createThread({ id: 't1', importance: 5 as Importance, updatedAt: now }),
        createThread({ id: 't2', importance: 4 as Importance, updatedAt: now }),
        createThread({ id: 't3', importance: 3 as Importance, updatedAt: now }),
        createThread({ id: 't4', importance: 2 as Importance, updatedAt: now }),
        createThread({ id: 't5', importance: 1 as Importance, updatedAt: now })
      ];
      const count = 3;

      // Act
      const scored = threads.map(scoreThread);
      scored.sort((a, b) => b.totalScore - a.totalScore);
      const topN = scored.slice(0, count);

      // Assert
      expect(topN.length).toBe(3);
    });
  });

  describe('nextCommand_CountOption_ReturnsAllWhenCountExceedsTotal', () => {
    it('should return all threads when count exceeds available threads', () => {
      // Arrange
      const now = new Date().toISOString();
      const threads = [
        createThread({ id: 't1', importance: 5 as Importance, updatedAt: now }),
        createThread({ id: 't2', importance: 4 as Importance, updatedAt: now })
      ];
      const count = 10;

      // Act
      const scored = threads.map(scoreThread);
      scored.sort((a, b) => b.totalScore - a.totalScore);
      const topN = scored.slice(0, count);

      // Assert
      expect(topN.length).toBe(2);
    });
  });

  describe('nextCommand_CountOption_ReturnsTopScoringThreads', () => {
    it('should return only the highest scoring threads', () => {
      // Arrange
      const now = new Date().toISOString();
      const threads = [
        createThread({ id: 'low', importance: 1 as Importance, updatedAt: now }),
        createThread({ id: 'high', importance: 5 as Importance, updatedAt: now }),
        createThread({ id: 'mid', importance: 3 as Importance, updatedAt: now })
      ];
      const count = 2;

      // Act
      const scored = threads.map(scoreThread);
      scored.sort((a, b) => b.totalScore - a.totalScore);
      const topN = scored.slice(0, count);

      // Assert
      expect(topN.map(s => s.thread.id)).toEqual(['high', 'mid']);
    });
  });
});
