import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { SidebarProvider } from '@/context/SidebarContext';
import { CustomerPortalSidebar } from './CustomerPortalSidebar';
import CustomerPortalHeader from '@/components/layout/CustomerPortalHeader';
import { useCustomerAuth } from '@/context/CustomerAuthContext';

import { QuickCreateTicketDialog } from '@/components/customer-portal/QuickCreateTicketDialog';

export default function CustomerPortalLayout() {
  const { user } = useCustomerAuth();
  const [quickTicketOpen, setQuickTicketOpen] = useState(false);

  return (
    <SidebarProvider>
      <div
        className="min-h-screen w-full flex bg-gradient-to-br from-gray-50 via-white to-gray-50/50 dark:from-background dark:via-background dark:to-background"
        style={{
          "--primary": "3 79% 49%",
          "--ring": "3 79% 49%",
        } as React.CSSProperties}
      >
        <CustomerPortalSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <CustomerPortalHeader onQuickTicket={() => setQuickTicketOpen(true)}>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground hidden md:block">
                Service Portal
              </h1>
              {user?.customer?.company && (
                <span className="text-sm text-muted-foreground hidden md:block">
                  • {user.customer.company}
                </span>
              )}
            </div>
          </CustomerPortalHeader>

          <main className="flex-1 overflow-auto p-4 sm:p-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
            <Outlet />
          </main>
        </div>


        <QuickCreateTicketDialog 
          open={quickTicketOpen} 
          onOpenChange={setQuickTicketOpen} 
        />
      </div>
    </SidebarProvider>
  );
}