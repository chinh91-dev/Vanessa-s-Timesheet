import { supabase } from "@/integrations/supabase/client";
import { ImportResult, ImportProgress } from "./import-service";
import { ContactPreviewRow } from "@/components/crm/contacts/ContactImportPreview";

const BATCH_SIZE = 10;

export const importContactsFromPreview = async (
  data: ContactPreviewRow[],
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  let successCount = 0;
  const processingErrors: string[] = [];

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const rowIndex = i + j + 1;

      onProgress?.({
        processed: i + j,
        total: data.length,
        current: row.company_name || `Row ${rowIndex}`,
      });

      try {
        // Validate required field
        if (!row.contact_name?.trim()) {
          throw new Error("Contact name is required");
        }

        const contactData = {
          contact_name: row.contact_name.trim(),
          company_name: row.company_name?.trim() || null,
          email: row.email?.trim() || null,
          work_phone: row.work_phone?.trim() || null,
          mobile_phone: row.mobile_phone?.trim() || null,
          title: row.title?.trim() || null,
          source: row.source?.trim() || null,
          notes: row.notes?.trim() || null,
        };

        const { error } = await supabase.from("contacts").insert(contactData);

        if (error) throw error;
        successCount++;
      } catch (error) {
        processingErrors.push(
          `Row ${rowIndex}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  return {
    success: successCount,
    errors: processingErrors.length,
    validationErrors: [],
    processingErrors,
  };
};

// Legacy alias for backward compatibility
export const importLeadsFromPreview = importContactsFromPreview;
