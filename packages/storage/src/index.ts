// Interfaces
export type {
  IThreadStore,
  IFileThreadStore,
  ThreadFilter,
  ContainerFilter,
  BackupInfo,
} from './interfaces';

// Class implementation
export { JsonFileStore } from './store';

// Backwards-compatible function exports (use default instance)
export {
  // Thread operations
  getAllThreads,
  getThreadById,
  getThreadByName,
  findThreads,
  addThread,
  updateThread,
  deleteThread,
  // Container operations
  getAllContainers,
  getContainerById,
  getContainerByName,
  findContainers,
  addContainer,
  updateContainer,
  deleteContainer,
  // Group operations
  getAllGroups,
  getGroupById,
  getGroupByName,
  addGroup,
  updateGroup,
  deleteGroup,
  // Entity operations
  getEntityById,
  getEntityByName,
  getAllEntities,
  isContainer,
  isThread,
  // Backup operations
  getBackupInfo,
  loadBackupData,
  restoreFromBackup,
  getDataFilePath,
  getBackupFilePath,
  // Raw data access (legacy)
  loadData,
  saveData,
} from './store';
