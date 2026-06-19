// Predefined color palette for owner identification
// Each color has ring, background, and text variants for consistent theming

const OWNER_COLORS = [
  { ring: "ring-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  { ring: "ring-green-500", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", dot: "bg-green-500" },
  { ring: "ring-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  { ring: "ring-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500" },
  { ring: "ring-pink-500", bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-600 dark:text-pink-400", dot: "bg-pink-500" },
  { ring: "ring-teal-500", bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500" },
  { ring: "ring-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-500" },
  { ring: "ring-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500" },
];

const UNASSIGNED_COLOR = { 
  ring: "ring-gray-400", 
  bg: "bg-gray-100 dark:bg-gray-800/30", 
  text: "text-gray-500 dark:text-gray-400",
  dot: "bg-gray-400"
};

// Simple hash function to get consistent index from owner_id
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export interface OwnerColor {
  ring: string;
  bg: string;
  text: string;
  dot: string;
}

/**
 * Get consistent color scheme for an owner based on their ID
 * Returns the same color for the same owner_id across all views
 */
export function getOwnerColor(ownerId: string | null | undefined): OwnerColor {
  if (!ownerId || ownerId === 'unassigned') {
    return UNASSIGNED_COLOR;
  }
  
  const index = hashString(ownerId) % OWNER_COLORS.length;
  return OWNER_COLORS[index];
}

/**
 * Get all owner colors for legend/reference
 */
export function getAllOwnerColors(): OwnerColor[] {
  return OWNER_COLORS;
}
