import React, { useState, useEffect } from "react";
import { History, User, Calendar, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AssetService } from "@/lib/asset-service";
import type { Asset, AssetHistory } from "@/types/asset-types";
import { toast } from "sonner";

interface AssetHistoryTabProps {
  asset: Asset;
}

export function AssetHistoryTab({ asset }: AssetHistoryTabProps) {
  const [history, setHistory] = useState<AssetHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [asset.id]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await AssetService.getAssetHistory(asset.id);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Failed to load asset history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'update':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'delete':
        return <FileText className="h-4 w-4 text-red-600" />;
      case 'link_incident':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'unlink_incident':
        return <FileText className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return 'Created';
      case 'update':
        return 'Updated';
      case 'delete':
        return 'Deleted';
      case 'link_incident':
        return 'Linked to Incident';
      case 'unlink_incident':
        return 'Unlinked from Incident';
      default:
        return action.charAt(0).toUpperCase() + action.slice(1);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'link_incident':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'unlink_incident':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatChanges = (before: Record<string, any> | null, after: Record<string, any> | null) => {
    if (!before && !after) return null;
    
    if (!before) {
      // Creation - show the new values
      return (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
          <p className="font-medium text-green-800 mb-1">Asset created with:</p>
          <div className="space-y-1">
            {Object.entries(after || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-green-700">{key}:</span>
                <span className="text-green-900 font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    if (!after) {
      // Deletion - show what was removed
      return (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <p className="font-medium text-red-800 mb-1">Asset deleted</p>
        </div>
      );
    }
    
    // Update - show changes
    const changes = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    for (const key of allKeys) {
      if (before[key] !== after[key]) {
        changes.push({ key, before: before[key], after: after[key] });
      }
    }
    
    if (changes.length === 0) return null;
    
    return (
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
        <p className="font-medium text-blue-800 mb-1">Changes made:</p>
        <div className="space-y-1">
          {changes.map(({ key, before, after }) => (
            <div key={key} className="space-y-1">
              <span className="text-blue-700 font-medium">{key}:</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-mono">
                  {String(before || 'null')}
                </span>
                <span className="text-blue-600">→</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-mono">
                  {String(after || 'null')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading history...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="mb-4">
          <div className="w-12 h-12 mx-auto bg-muted rounded-lg flex items-center justify-center">
            <History className="h-6 w-6" />
          </div>
        </div>
        <p className="text-sm font-medium">No history available</p>
        <p className="text-xs mt-1">
          Asset activity will appear here once changes are made.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Asset History</h3>
        <p className="text-sm text-muted-foreground">
          Complete audit trail of all changes made to this asset
        </p>
      </div>

      <Separator />

      <ScrollArea className="h-96">
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative">
              {/* Timeline connector */}
              {index < history.length - 1 && (
                <div className="absolute left-6 top-12 w-px h-8 bg-border"></div>
              )}
              
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-background border-2 border-border rounded-full flex items-center justify-center">
                  {getActionIcon(entry.action)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getActionColor(entry.action)}`}
                    >
                      {getActionLabel(entry.action)}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {entry.actor?.full_name || entry.actor?.email || 'System'}
                    </span>
                  </div>
                  
                  {/* Changes detail */}
                  {formatChanges(entry.before_data, entry.after_data)}
                  
                  {/* Special handling for incident links */}
                  {(entry.action === 'link_incident' || entry.action === 'unlink_incident') && entry.after_data?.incident_id && (
                    <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                      <p className="text-purple-800">
                        {entry.action === 'link_incident' ? 'Linked to' : 'Unlinked from'} incident: 
                        <span className="font-mono ml-1">{entry.after_data.incident_id}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}