export const incidentKeys = {
  all: ["incidents"] as const,

  list: () => ["incidents"] as const,
  detail: (id: string) => ["incident", id] as const,

  comments: (incidentId: string) => ["incident-comments", incidentId] as const,
  history: (incidentId: string) => ["incident-history", incidentId] as const,
  assets: (incidentId: string) => ["incident-assets", incidentId] as const,
  relationships: () => ["incident-relationships"] as const,

  myAssigned: () => ["my-assigned-incidents"] as const,
  userAssigned: (userId: string) => ["user-assigned-incidents", userId] as const,

  projects: {
    my: () => ["my-projects"] as const,
    members: (projectId: string) => ["project-members", projectId] as const,
    reporters: (projectId: string) => ["project-reporters", projectId] as const,
    team: (projectId: string) => ["incident-project-team", projectId] as const,
    assignments: (projectId: string) =>
      ["incident-project-assignments", projectId] as const,
    availableUsers: (projectId: string) =>
      ["available-users-for-project", projectId] as const,
    role: (projectId: string) => ["incident-project-role", projectId] as const,
    userIn: (projectId: string) => ["user-in-project", projectId] as const,
    slaConfigs: () => ["project-sla-configs"] as const,
  },

  sla: {
    agreements: () => ["sla-agreements"] as const,
    customerAgreements: () => ["customer-sla-agreements"] as const,
  },

  customer: {
    list: () => ["customer-incidents"] as const,
    detail: (id: string) => ["customer-incident", id] as const,
  },

  serviceCredits: () => ["service-credits"] as const,
} as const;
