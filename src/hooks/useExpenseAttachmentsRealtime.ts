import { useRealtimeSubscription } from "./useRealtimeSubscription";

export function useExpenseAttachmentsRealtime() {
  useRealtimeSubscription({
    table: 'expense_attachments',
    queryKeys: ['expense-attachments'],
    channelName: 'expense-attachments-realtime',
  });
}
