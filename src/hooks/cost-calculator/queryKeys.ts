export const costCalculatorKeys = {
  all: ["cost-calculator"] as const,

  tiers: {
    all: ["cost-calculator-tiers"] as const,
    list: () => ["cost-calculator-tiers-all"] as const,
    features: () => ["cost-calculator-tier-features"] as const,
    featuresAll: () => ["cost-calculator-tier-features-all"] as const,
  },

  salaries: {
    all: ["cost-calculator-salaries"] as const,
    list: () => ["cost-calculator-salaries-all"] as const,
  },

  companySizes: {
    all: ["cost-calculator-company-sizes"] as const,
    list: () => ["cost-calculator-company-sizes-all"] as const,
  },

  settings: {
    all: ["cost-calculator-settings"] as const,
    list: () => ["cost-calculator-settings-all"] as const,
  },

  inhouseConfig: {
    all: ["cost-calculator-inhouse-config"] as const,
    list: () => ["cost-calculator-inhouse-config-all"] as const,
  },

  supportTypes: {
    all: ["cost-calculator-support-types"] as const,
    list: () => ["cost-calculator-support-types-all"] as const,
  },

  complexityFactors: {
    all: ["cost-calculator-complexity-factors"] as const,
    list: () => ["cost-calculator-complexity-factors-all"] as const,
  },
} as const;
