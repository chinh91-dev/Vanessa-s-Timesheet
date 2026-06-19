export const crmKeys = {
  all: ["crm"] as const,

  accounts: {
    all: ["crm", "accounts"] as const,
    detail: (id: string) => ["crm", "accounts", id] as const,
  },

  contacts: {
    all: ["crm", "contacts"] as const,
    detail: (id: string) => ["crm", "contacts", id] as const,
    dealCounts: () => ["crm", "contact-deal-counts"] as const,
  },

  contactCategories: {
    all: ["crm", "contact-categories"] as const,
    list: () => ["crm", "contact-categories", "all"] as const,
    assignments: (contactId: string) =>
      ["crm", "contact-category-assignments", contactId] as const,
  },

  deals: {
    all: ["crm", "deals"] as const,
    detail: (id: string) => ["crm", "deals", id] as const,
    archived: () => ["crm", "archived-deals"] as const,
  },

  pipeline: {
    all: ["crm", "pipeline"] as const,
    stages: () => ["crm", "pipeline-stages"] as const,
  },

  prospects: {
    all: ["crm", "prospects"] as const,
    detail: (id: string) => ["crm", "prospects", id] as const,
  },

  services: {
    all: ["crm", "services"] as const,
    categories: () => ["crm", "service-categories"] as const,
  },

  tasks: {
    all: ["crm", "tasks"] as const,
    detail: (id: string) => ["crm", "tasks", id] as const,
  },

  meetings: {
    all: ["crm", "meetings"] as const,
    detail: (id: string) => ["crm", "meetings", id] as const,
  },

  customers: () => ["customers"] as const,
} as const;
