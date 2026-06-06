import type { AsinGroup, UserConfig } from './model';

export type CommandGroupListItem = {
  id: string;
  name: string;
  asins: string[];
  asinCount: number;
  selected: boolean;
  selectable: boolean;
};

export function isSelectableGroup(group: AsinGroup): boolean {
  return group.asins.length > 0;
}

export function getSelectableGroups(config: UserConfig | null): AsinGroup[] {
  if (!config) return [];

  return config.groups.filter(isSelectableGroup);
}

export function getSelectableGroupIds(config: UserConfig | null): string[] {
  return getSelectableGroups(config).map((group) => group.id);
}

function isRunnableGroup(group: AsinGroup, selectedIds: Set<string>): boolean {
  return selectedIds.has(group.id) && isSelectableGroup(group);
}

export function getRunnableGroups(config: UserConfig | null, selectedIds: Set<string>): AsinGroup[] {
  if (!config) return [];

  return config.groups.filter((group) => isRunnableGroup(group, selectedIds));
}

export function getCommandGroupItems(
  config: UserConfig | null,
  selectedIds: Set<string>,
): CommandGroupListItem[] {
  if (!config) return [];

  return config.groups.map((group) => ({
    id: group.id,
    name: group.name,
    asins: group.asins,
    asinCount: group.asins.length,
    selected: selectedIds.has(group.id),
    selectable: isSelectableGroup(group),
  }));
}
