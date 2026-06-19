
import { EntityType } from "./config";

export const getRowIdentifier = (row: Record<string, string>, entityType: EntityType): string => {
  switch (entityType) {
    case 'projects':
    case 'customers':
    case 'contracts':
      return row.name || 'Unnamed';
    case 'team-members':
      return row.email || row.full_name || 'Unknown';
    default:
      return 'Processing...';
  }
};
