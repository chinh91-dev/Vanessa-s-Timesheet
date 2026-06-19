import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the file path from a stored URL or path.
 * Handles both legacy signed URLs and direct file paths.
 */
export function extractFilePath(storedValue: string, bucketName: string): string {
  // If it starts with the bucket name as a prefix, strip it
  const bucketPrefix = `${bucketName}/`;
  if (storedValue.startsWith(bucketPrefix)) {
    return storedValue.slice(bucketPrefix.length);
  }

  // If it's not a URL, assume it's already a file path
  if (!storedValue.startsWith('http')) {
    return storedValue;
  }

  try {
    // Handle signed URLs - extract path before the query params
    const url = new URL(storedValue);
    const pathParts = url.pathname.split(`/${bucketName}/`);
    if (pathParts.length > 1) {
      // Get the path and remove query params if any
      const path = pathParts[1].split('?')[0];
      return decodeURIComponent(path);
    }
    
    // Try alternative pattern for public URLs
    const publicPattern = `/object/public/${bucketName}/`;
    if (url.pathname.includes(publicPattern)) {
      const parts = url.pathname.split(publicPattern);
      if (parts.length > 1) {
        return decodeURIComponent(parts[1]);
      }
    }
    
    // Try storage/v1/object pattern
    const storagePattern = `/storage/v1/object/sign/${bucketName}/`;
    if (url.pathname.includes(storagePattern)) {
      const parts = url.pathname.split(storagePattern);
      if (parts.length > 1) {
        return decodeURIComponent(parts[1]);
      }
    }
    
    // Fallback: try to extract from pathname
    const segments = url.pathname.split('/');
    const bucketIndex = segments.indexOf(bucketName);
    if (bucketIndex !== -1 && bucketIndex < segments.length - 1) {
      return decodeURIComponent(segments.slice(bucketIndex + 1).join('/'));
    }
  } catch (error) {
    console.error('Error parsing URL:', error);
  }

  // Return original if we can't extract the path
  return storedValue;
}

/**
 * Generates a signed URL for accessing a file in a private bucket.
 * Handles both legacy URLs (extracts path) and direct file paths.
 * 
 * @param bucketName - The Supabase storage bucket name
 * @param storedValue - Either a file path or a legacy signed URL
 * @param expiresIn - URL expiry time in seconds (default: 1 hour)
 * @returns A fresh signed URL or null if generation fails
 */
export async function getSignedUrl(
  bucketName: string,
  storedValue: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!storedValue) {
    return null;
  }

  // Extract the file path from the stored value
  const filePath = extractFilePath(storedValue, bucketName);

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error(`Error creating signed URL for ${bucketName}/${filePath}:`, error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error(`Error generating signed URL:`, error);
    return null;
  }
}

/**
 * Bucket-specific helpers for common attachment types
 */
export const storageHelpers = {
  taskAttachments: {
    getSignedUrl: (storedValue: string) => getSignedUrl('task-attachments', storedValue),
  },
  leaveAttachments: {
    getSignedUrl: (storedValue: string) => getSignedUrl('leave-attachments', storedValue),
  },
  contracts: {
    getSignedUrl: (storedValue: string) => getSignedUrl('contracts', storedValue),
  },
  ohsAttachments: {
    getSignedUrl: (storedValue: string) => getSignedUrl('ohs-attachments', storedValue),
  },
  commentAttachments: {
    getSignedUrl: (storedValue: string) => getSignedUrl('comment-attachments', storedValue),
  },
  expenseReceipts: {
    getSignedUrl: (storedValue: string) => getSignedUrl('expense-receipts', storedValue),
  },
};
