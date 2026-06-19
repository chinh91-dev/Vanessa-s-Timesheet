import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDeals } from "@/hooks/crm/useDeals";
import { formatCurrency, formatDate } from "@/lib/crm/formatting";
import { DEAL_STATUS_LABELS } from "@/lib/crm/constants";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { DealDialog } from "@/components/crm/deals/DealDialog";

export default function DealsPage() {
  const { userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>();
  
  const { data: deals, isLoading } = useDeals();

  const filteredDeals = deals?.filter(deal => {
    const matchesSearch = deal.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.primary_contact?.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.primary_contact?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || deal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-500/10 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
      case "pending": return "bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      case "approved": return "bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800";
      case "rejected": return "bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800";
      case "closed": return "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default: return "bg-gray-500/10 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Deals</h1>
            <p className="text-muted-foreground mt-1">Manage deals in proposal stage</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Status</option>
              {Object.entries(DEAL_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !filteredDeals?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No deals found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDeals.map(deal => (
              <Card 
                key={deal.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => { setSelectedDeal(deal); setDialogOpen(true); }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{deal.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {deal.primary_contact?.contact_name || deal.primary_contact?.company_name || "No contact"}
                      </p>
                    </div>
                    <Badge className={getStatusColor(deal.status)}>
                      {DEAL_STATUS_LABELS[deal.status] || deal.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contract Value:</span>
                    <span className="font-semibold">{formatCurrency(deal.contract_value || 0)}</span>
                  </div>
                  {deal.discount_amount && deal.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount:</span>
                      <span>{formatCurrency(deal.discount_amount)}</span>
                    </div>
                  )}
                  {deal.creator && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Owner:</span>
                      <span>{deal.creator.full_name || deal.creator.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DealDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedDeal(undefined); }}
        deal={selectedDeal}
      />
    </div>
  );
}
