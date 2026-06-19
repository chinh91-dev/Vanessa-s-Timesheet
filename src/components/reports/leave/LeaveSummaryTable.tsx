import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeaveUsageTable from "./LeaveUsageTable";
import LeaveBalanceTable from "./LeaveBalanceTable";

interface LeaveSummaryTableProps {
  data: {
    usage: any;
    balance: any;
  };
  isLoading: boolean;
}

const LeaveSummaryTable = ({ data, isLoading }: LeaveSummaryTableProps) => {
  return (
    <Tabs defaultValue="usage" className="w-full">
      <TabsList>
        <TabsTrigger value="usage">Usage Summary</TabsTrigger>
        <TabsTrigger value="balance">Balance Summary</TabsTrigger>
      </TabsList>
      <TabsContent value="usage" className="mt-4">
        <LeaveUsageTable data={data?.usage} isLoading={isLoading} />
      </TabsContent>
      <TabsContent value="balance" className="mt-4">
        <LeaveBalanceTable data={data?.balance} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  );
};

export default LeaveSummaryTable;