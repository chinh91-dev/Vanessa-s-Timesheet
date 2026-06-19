/**
 * Helper function to extract user name from various expense user_name formats
 */
type UserNameInput =
  | string
  | { full_name: string }
  | Array<{ full_name: string }>
  | null
  | undefined;

export const extractUserName = (user_name: UserNameInput): string => {
  if (!user_name) {
    return 'Unknown User';
  }

  // Handle array format (legacy)
  if (Array.isArray(user_name)) {
    const firstUser = user_name[0];
    if (firstUser && typeof firstUser === 'object' && 'full_name' in firstUser) {
      return firstUser.full_name;
    }
    return 'Unknown User';
  }

  // Handle object format
  if (typeof user_name === 'object' && 'full_name' in user_name) {
    return user_name.full_name;
  }

  // Handle string format
  if (typeof user_name === 'string') {
    return user_name;
  }

  return 'Unknown User';
};