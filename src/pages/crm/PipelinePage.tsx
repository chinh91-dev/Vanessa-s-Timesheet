import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PipelineBoard } from "@/components/crm/pipeline/PipelineBoard";
import { usePipeline } from "@/hooks/crm/usePipeline";
import { formatCurrency } from "@/lib/crm/formatting";
import { useIsMobile } from "@/hooks/use-mobile";
import MobilePipelineView from "@/components/crm/mobile/MobilePipelineView";
import { usePipelineStages } from "@/hooks/crm/usePipelineStages";
import { DealDialog } from "@/components/crm/deals/DealDialog";
import { useDealMovement } from "@/hooks/crm/useDealMovement";
import CRMTimeEntryDialog from "@/components/crm/CRMTimeEntryDialog";
import { getOwnerColor } from "@/lib/crm/ownerColors";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  getCurrentAustralianFY, 
  getAustralianFY, 
  getAustralianFYLabel,
  getFYKey,
  getFYFromKey,
  DateRangeType 
} from "@/lib/crm/financial-year-utils";

interface OwnerStat {
  name: string;
  count: number;
}

export default function PipelinePage() {
  const { data: deals, isLoading } = usePipeline();
  const { data: stages } = usePipelineStages();
  const isMobile = useIsMobile();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedFY, setSelectedFY] = useState<DateRangeType>(getCurrentAustralianFY());

  // FY options for dropdown
  const fyOptions = useMemo(() => [
    { label: "This Financial Year", value: getCurrentAustralianFY() },
    { label: "Last Financial Year", value: getAustralianFY(1) },
    { label: "2 Years Ago", value: getAustralianFY(2) },
  ], []);

  const {
    validateAndMoveDeal,
    executeCloseLostMove,
    selectedDeal,
    setSelectedDeal,
    dialogOpen,
    setDialogOpen,
    pendingTargetStageId,
    setPendingTargetStageId,
    dialogResetKey,
    closeLostDialogOpen,
    setCloseLostDialogOpen,
    closeLostDealData,
    timeEntryDialogOpen,
    setTimeEntryDialogOpen,
    timeEntryDealData,
  } = useDealMovement();

  // Filter deals by Financial Year first
  const fyFilteredDeals = useMemo(() => {
    return deals?.filter(deal => {
      // For closed deals, use stage_entered_at (when they were closed)
      // For open deals, include if they were created within FY
      const isClosedStage = deal.is_closed_won || deal.is_closed_lost;
      const dateToCheck = isClosedStage 
        ? new Date(deal.stage_entered_at || deal.created_at)
        : new Date(deal.created_at);
      
      return dateToCheck >= selectedFY.from && dateToCheck <= selectedFY.to;
    });
  }, [deals, selectedFY]);

  // Calculate owner stats from FY-filtered deals
  const ownerStats = useMemo(() => {
    const stats = new Map<string, OwnerStat>();
    fyFilteredDeals?.forEach(deal => {
      const key = deal.owner_id || 'unassigned';
      const name = deal.owner_name || 'Unassigned';
      const existing = stats.get(key) || { name, count: 0 };
      stats.set(key, { name, count: existing.count + 1 });
    });
    return stats;
  }, [fyFilteredDeals]);

  // Filter deals based on selected owner (from FY-filtered deals)
  const filteredDeals = useMemo(() => {
    if (!selectedOwnerId) return fyFilteredDeals;
    return fyFilteredDeals?.filter(d => (d.owner_id || 'unassigned') === selectedOwnerId);
  }, [fyFilteredDeals, selectedOwnerId]);

  // Calculate summary stats from filtered deals
  const totalDeals = filteredDeals?.length || 0;
  const totalValue = filteredDeals?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;
  
  // Closed Won deals contribute 100% (revenue secured)
  const closedWonDeals = filteredDeals?.filter(d => d.is_closed_won) || [];
  const closedWonValue = closedWonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  
  // Weighted value: 100% for Closed Won, probability% for others
  const weightedValue = filteredDeals?.reduce((sum, deal) => {
    const amount = deal.amount || 0;
    if (deal.is_closed_won) {
      return sum + amount; // 100% weighted
    }
    if (deal.is_closed_lost) {
      return sum; // 0% for lost deals
    }
    const probability = (deal.stage_probability || 0) / 100;
    return sum + (amount * probability);
  }, 0) || 0;

  // Mobile handlers
  const handleDealClick = (deal: any) => {
    setSelectedDeal(deal);
    setPendingTargetStageId(null);
    setDialogOpen(true);
  };

  const handleAddDeal = (stageId: string) => {
    setSelectedDeal(undefined);
    setPendingTargetStageId(stageId); // Pre-select stage
    setDialogOpen(true);
  };

  // Owner filter chips component
  const OwnerFilterChips = () => {
    const totalCount = deals?.length || 0;
    
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-1">Filter by Owner:</span>
        {/* All chip */}
        <button
          onClick={() => setSelectedOwnerId(null)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            selectedOwnerId === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
        >
          All ({totalCount})
        </button>
        
        {/* Owner chips */}
        {Array.from(ownerStats.entries()).map(([ownerId, stat]) => {
          const color = getOwnerColor(ownerId);
          const isSelected = selectedOwnerId === ownerId;
          
          return (
            <button
              key={ownerId}
              onClick={() => setSelectedOwnerId(ownerId)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              <span className={cn("w-2.5 h-2.5 rounded-full", color.dot)} />
              {stat.name.split(" ")[0]} ({stat.count})
            </button>
          );
        })}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <MobilePipelineView
          deals={filteredDeals || []}
          stages={stages || []}
          onDealClick={handleDealClick}
          onAddDeal={handleAddDeal}
          onOpenFilters={() => console.log("Filters clicked")}
          onMoveDeal={validateAndMoveDeal}
          className="flex-1"
        />

        <DealDialog
          key={dialogResetKey}
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedDeal(undefined);
            setPendingTargetStageId(null);
          }}
          deal={selectedDeal as any}
          pendingTargetStageId={pendingTargetStageId}
          hideFieldsOnEdit
        />

        {/* Time Entry Dialog for deal movements */}
        <CRMTimeEntryDialog
          open={timeEntryDialogOpen}
          onClose={() => setTimeEntryDialogOpen(false)}
          activityType="deal"
          activityTitle={timeEntryDealData?.taskTitle || ""}
          activityId={timeEntryDealData?.dealId || ""}
          onTimeLogged={() => setTimeEntryDialogOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-3 md:p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              {getAustralianFYLabel(selectedFY.from)} — Visualize and manage your sales pipeline
            </p>
          </div>
          
          {/* FY Selector */}
          <Select 
            value={getFYKey(selectedFY)} 
            onValueChange={(key) => setSelectedFY(getFYFromKey(key))}
          >
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select FY" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {fyOptions.map(opt => (
                <SelectItem key={getFYKey(opt.value)} value={getFYKey(opt.value)}>
                  {getAustralianFYLabel(opt.value.from)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats Bar - 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="py-2 px-3">
              <div className="text-xs text-muted-foreground">Total Deals</div>
              <div className="text-xl font-bold">{totalDeals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-2 px-3">
              <div className="text-xs text-muted-foreground">Pipeline Value</div>
              <div className="text-xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-2 px-3">
              <div className="text-xs text-muted-foreground">Weighted Forecast</div>
              <div className="text-xl font-bold">{formatCurrency(weightedValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-2 px-3">
              <div className="text-xs text-muted-foreground">Closed Won Revenue</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(closedWonValue)}</div>
              <div className="text-xs text-muted-foreground">
                {closedWonDeals.length} deal{closedWonDeals.length !== 1 ? 's' : ''} won
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Owner Filter Chips */}
        <OwnerFilterChips />
      </div>

      <div className="flex-1 overflow-hidden">
        <PipelineBoard
          deals={filteredDeals || []}
          isLoading={isLoading}
          activeStages={stages?.filter(s => s.is_active) || []}
          validateAndMoveDeal={validateAndMoveDeal}
          selectedDeal={selectedDeal}
          setSelectedDeal={setSelectedDeal}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          pendingTargetStageId={pendingTargetStageId}
          setPendingTargetStageId={setPendingTargetStageId}
          dialogResetKey={dialogResetKey}
          closeLostDialogOpen={closeLostDialogOpen}
          setCloseLostDialogOpen={setCloseLostDialogOpen}
          closeLostDealData={closeLostDealData}
          executeCloseLostMove={executeCloseLostMove}
        />
      </div>

      {/* Time Entry Dialog for deal movements (desktop) */}
      <CRMTimeEntryDialog
        open={timeEntryDialogOpen}
        onClose={() => setTimeEntryDialogOpen(false)}
        activityType="deal"
        activityTitle={timeEntryDealData?.taskTitle || ""}
        activityId={timeEntryDealData?.dealId || ""}
        onTimeLogged={() => setTimeEntryDialogOpen(false)}
      />
    </div>
  );
}
