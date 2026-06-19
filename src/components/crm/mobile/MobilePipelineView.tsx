import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Filter, DollarSign, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptic';
import type { PipelineItem, PipelineStage } from '@/lib/crm/types';
import { useDrag } from '@use-gesture/react';

interface MobilePipelineViewProps {
  stages: PipelineStage[];
  deals: PipelineItem[];
  onDealClick: (deal: PipelineItem) => void;
  onAddDeal: (stageId: string) => void;
  onOpenFilters: () => void;
  onMoveDeal?: (deal: PipelineItem, newStageId: string) => void;
  className?: string;
}

export const MobilePipelineView: React.FC<MobilePipelineViewProps> = ({
  stages,
  deals,
  onDealClick,
  onAddDeal,
  onOpenFilters,
  onMoveDeal,
  className,
}) => {
  const [selectedStageId, setSelectedStageId] = useState(stages[0]?.id || '');
  const stageScrollRef = useRef<HTMLDivElement>(null);

  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);
  const currentStageIndex = sortedStages.findIndex(s => s.id === selectedStageId);

  const stageDeals = deals.filter(deal => deal.stage_id === selectedStageId);

  const getStageDealCount = (stageId: string) =>
    deals.filter(d => d.stage_id === stageId).length;

  const getStageTotalValue = (stageId: string) =>
    deals
      .filter(d => d.stage_id === stageId)
      .reduce((sum, d) => sum + (d.amount || 0), 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const handleStageSelect = (stageId: string) => {
    triggerHaptic('selection');
    setSelectedStageId(stageId);
  };

  const getNextStage = () => {
    if (currentStageIndex < sortedStages.length - 1) {
      return sortedStages[currentStageIndex + 1];
    }
    return null;
  };

  const getPrevStage = () => {
    if (currentStageIndex > 0) {
      return sortedStages[currentStageIndex - 1];
    }
    return null;
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with Filter Button */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h2 className="text-lg font-semibold">Pipeline</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            triggerHaptic('light');
            onOpenFilters();
          }}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
        </Button>
      </div>

      {/* Stage Tabs */}
      <div className="border-b bg-muted/30">
        <ScrollArea className="w-full">
          <div
            ref={stageScrollRef}
            className="flex gap-2 px-4 py-3"
          >
            {sortedStages.map(stage => {
              const isSelected = selectedStageId === stage.id;
              const dealCount = getStageDealCount(stage.id);
              const totalValue = getStageTotalValue(stage.id);

              return (
                <button
                  key={stage.id}
                  onClick={() => handleStageSelect(stage.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[100px]",
                    "transition-all duration-200 whitespace-nowrap",
                    "active:scale-95",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-background border border-border hover:bg-accent"
                  )}
                >
                  <span className="text-sm font-medium">{stage.name}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}>
                      {dealCount} deals
                    </span>
                    <span className={isSelected ? "text-primary-foreground" : "text-foreground font-medium"}>
                      {formatCurrency(totalValue)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Stage Summary */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent border-b">
        <div>
          <h3 className="font-semibold">
            {sortedStages.find(s => s.id === selectedStageId)?.name || 'Stage'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {stageDeals.length} {stageDeals.length === 1 ? 'deal' : 'deals'} • {formatCurrency(getStageTotalValue(selectedStageId))} total
          </p>
        </div>
      </div>

      {/* Deals List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overflow-x-hidden">
        {stageDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No deals in this stage</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => onAddDeal(selectedStageId)}
              className="mt-2"
            >
              Add your first deal
            </Button>
          </div>
        ) : (
          stageDeals.map(deal => (
            <MobileDealCard
              key={deal.id}
              deal={deal}
              onClick={() => {
                triggerHaptic('light');
                onDealClick(deal);
              }}
              onSwipeRight={
                onMoveDeal && getNextStage()
                  ? () => onMoveDeal(deal, getNextStage()!.id)
                  : undefined
              }
              onSwipeLeft={
                onMoveDeal && getPrevStage()
                  ? () => onMoveDeal(deal, getPrevStage()!.id)
                  : undefined
              }
              nextStageName={getNextStage()?.name}
              prevStageName={getPrevStage()?.name}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface MobileDealCardProps {
  deal: PipelineItem;
  onClick: () => void;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  nextStageName?: string;
  prevStageName?: string;
}

const MobileDealCard: React.FC<MobileDealCardProps> = ({
  deal,
  onClick,
  onSwipeRight,
  onSwipeLeft,
  nextStageName,
  prevStageName
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const [swipeX, setSwipeX] = useState(0);

  const bind = useDrag(({ active, movement: [mx], cancel }) => {
    if (active && mx > 100) {
      if (onSwipeRight) {
        cancel();
        triggerHaptic('success');
        onSwipeRight();
        setSwipeX(0); // Reset immediately? Or wait for animation? 
        // In a real app we might animate out, but here let's just snap back after action
      }
    } else if (active && mx < -100) {
      if (onSwipeLeft) {
        cancel();
        triggerHaptic('selection');
        onSwipeLeft();
        setSwipeX(0);
      }
    } else {
      setSwipeX(active ? mx : 0);
    }
  }, {
    axis: 'x',
    filterTaps: true,
  });

  return (
    <div className="relative touch-pan-y">
      {/* Swipe Backgrounds */}
      <div className={cn(
        "absolute inset-y-0 left-0 flex items-center pl-4 w-full rounded-lg bg-green-500/10 transition-opacity",
        swipeX > 50 ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center text-green-600 font-medium text-sm">
          <ArrowRight className="mr-2 h-4 w-4" />
          Move to {nextStageName}
        </div>
      </div>

      <div className={cn(
        "absolute inset-y-0 right-0 flex items-center justify-end pr-4 w-full rounded-lg bg-orange-500/10 transition-opacity",
        swipeX < -50 ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center text-orange-600 font-medium text-sm">
          Move to {prevStageName}
          <ArrowLeft className="ml-2 h-4 w-4" />
        </div>
      </div>

      <Card
        {...bind()}
        className="cursor-pointer hover:shadow-md transition-transform active:scale-[0.98] relative bg-card z-10"
        style={{ transform: `translateX(${swipeX}px)` }}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{deal.deal_name}</h4>
              {deal.account_name && (
                <p className="text-sm text-muted-foreground truncate">{deal.account_name}</p>
              )}
              {deal.primary_contact_name && (
                <p className="text-xs text-muted-foreground mt-1">{deal.primary_contact_name}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-primary">{formatCurrency(deal.amount || 0)}</p>
              {deal.stage_probability !== undefined && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {deal.stage_probability}%
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobilePipelineView;
