export type SyncProgress = {
  type: 'log' | 'asin-start' | 'asin-done' | 'group-start' | 'group-done' | 'done' | 'error';
  message?: string;
  asin?: string;
  groupId?: string;
  payload?: unknown;
};

export type SyncAsinsOptions = {
  /** 要同步的分组 id；不传则仅同步 activeGroupId */
  groupIds?: string[];
};
