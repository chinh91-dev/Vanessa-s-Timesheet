export const assetKeys = {
  all: ["assets"] as const,

  list: () => ["assets"] as const,
  detail: (id: string) => ["assets", id] as const,

  groups: {
    all: ["asset-groups"] as const,
    list: () => ["asset-groups"] as const,
    detail: (groupId: string) => ["asset-group", groupId] as const,
  },
} as const;
