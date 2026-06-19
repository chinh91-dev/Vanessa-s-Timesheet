import React, { useState, useMemo } from "react";
import { Archive, Search, TrendingDown, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClosedLostDeals } from "@/hooks/crm/useCRMArchive";
import { DealDialog } from "@/components/crm/deals/DealDialog";
import { formatCurrency } from "@/lib/crm/formatting";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import type { Deal } from "@/lib/crm/types";

const CRMArchivePage = () => {
  const { userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);

  // All CRM users can edit deals (broad coverage)
  const isReadOnly = false;
  const canDelete = userRole === 'admin';

  const { data: closedLostDeals = [], isLoading: dealsLoading } = useClosedLostDeals();

  // Filter deals by search
  const filteredDeals = useMemo(() => {
    if (!searchQuery.trim()) return closedLostDeals;
    const query = searchQuery.toLowerCase();
    return closedLostDeals.filter(deal =>
      deal.name?.toLowerCase().includes(query) ||
      (deal.account as any)?.name?.toLowerCase().includes(query)
    );
  }, [closedLostDeals, searchQuery]);

  // Statistics
  const totalLostValue = closedLostDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0);

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setDealDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Archive className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">CRM Archive</h1>
            <p className="text-sm text-muted-foreground">Closed lost deals</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lost Deals</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedLostDeals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lost Value</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalLostValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lost Deals Table */}
      <Card>
        <CardContent className="p-0">
          {dealsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading deals...</div>
          ) : filteredDeals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? "No deals match your search" : "No closed lost deals"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal Name</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Lost Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => (
                  <TableRow
                    key={deal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleDealClick(deal)}
                  >
                    <TableCell className="font-medium">{deal.name || "Unnamed Deal"}</TableCell>
                    <TableCell>{(deal.account as any)?.name || "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(deal.amount || 0)}</TableCell>
                    <TableCell>
                      {deal.close_date ? format(new Date(deal.close_date), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell>{(deal.owner as any)?.full_name || "-"}</TableCell>
                    <TableCell>
                      {deal.updated_at ? format(new Date(deal.updated_at), "dd MMM yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Deal Dialog */}
      {selectedDeal && (
        <DealDialog
          open={dealDialogOpen}
          onClose={() => {
            setDealDialogOpen(false);
            setSelectedDeal(null);
          }}
          deal={selectedDeal}
          readOnly={isReadOnly}
          canDelete={canDelete}
        />
      )}
    </div>
  );
};

export default CRMArchivePage;
