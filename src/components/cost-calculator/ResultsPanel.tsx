import { useState } from "react";
import { ChevronDown, ChevronUp, Check, TrendingDown } from "lucide-react";
import { CostCalculatorTier, CostCalculatorInhouseConfig, CostCalculatorSalary } from "@/hooks/useCostCalculatorData";

interface ResultsPanelProps {
  comansTotal: number;
  perUserRate: number;
  tier: CostCalculatorTier;
  userCount: number;
  securityAddon: boolean;
  securityAddonRate: number;
  inhouseTotal: number;
  inhouseBreakdown: {
    serviceDesk: number;
    sysAdmin: number;
    manager: number;
  };
  volumeDiscount: number;
  inhouseConfig?: CostCalculatorInhouseConfig;
  salaries?: CostCalculatorSalary[];
}

const ResultsPanel = ({
  comansTotal,
  perUserRate,
  tier,
  userCount,
  securityAddon,
  securityAddonRate,
  inhouseTotal,
  inhouseBreakdown,
  volumeDiscount,
  inhouseConfig,
  salaries,
}: ResultsPanelProps) => {
  const [showComansAssumptions, setShowComansAssumptions] = useState(false);
  const [showInhouseAssumptions, setShowInhouseAssumptions] = useState(false);

  const savings = inhouseTotal - comansTotal;
  const savingsPercent = inhouseTotal > 0 ? Math.round((savings / inhouseTotal) * 100) : 0;
  const inhousePerUser = userCount > 0 ? Math.round(inhouseTotal / userCount) : 0;

  // Round to nearest $100
  const roundedComansTotal = Math.round(comansTotal / 100) * 100;
  const roundedInhouseTotal = Math.round(inhouseTotal / 100) * 100;

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-8">
      {/* Comans Panel */}
      <div className="relative overflow-hidden bg-card rounded-xl p-6 border border-green-200 dark:border-green-800 shadow-lg">
        {/* Green top stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-600 to-green-400" />
        
        <h3 className="text-lg font-semibold text-foreground mb-4">Comans Managed Services</h3>
        
        <div className="mb-4">
          <div className="text-4xl font-bold text-foreground">
            ~${roundedComansTotal.toLocaleString()}
            <span className="text-lg font-normal text-muted-foreground">/mo</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            ${perUserRate}/user/month
            {volumeDiscount > 0 && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                ({Math.round(volumeDiscount * 100)}% volume discount applied)
              </span>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2">
            Based on: <span className="font-semibold text-foreground">{tier.label}</span>
          </div>
          <ul className="space-y-1">
            {tier.features.slice(0, 5).map((feature) => (
              <li key={feature.id} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <span>{feature.feature}</span>
              </li>
            ))}
            {tier.features.length > 5 && (
              <li className="text-sm text-muted-foreground pl-6">
                +{tier.features.length - 5} more features
              </li>
            )}
          </ul>
        </div>

        <button
          onClick={() => setShowComansAssumptions(!showComansAssumptions)}
          className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-green-600 to-green-700 rounded-lg hover:from-green-500 hover:to-green-600 transition-all"
        >
          {showComansAssumptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          View assumptions
        </button>
        
        {showComansAssumptions && (
          <div className="mt-3 p-3 bg-muted rounded-lg text-xs text-muted-foreground space-y-1 border border-border">
            <p>• {userCount} users × ${tier.rate_per_user}/user = ${userCount * tier.rate_per_user}/mo base</p>
            {securityAddon && !tier.security_included && (
              <p>• Security add-on: {userCount} × ${securityAddonRate} = ${userCount * securityAddonRate}/mo</p>
            )}
            {volumeDiscount > 0 && (
              <p>• Volume discount: {Math.round(volumeDiscount * 100)}% off</p>
            )}
            <p>• Minimum monthly: ${tier.min_monthly.toLocaleString()}</p>
            <p>• Final pricing confirmed after discovery call</p>
          </div>
        )}
      </div>

      {/* In-house Panel */}
      <div className="bg-muted rounded-xl p-6 border border-dashed border-border">
        <h3 className="text-lg font-semibold text-muted-foreground mb-4">In-house Comparison</h3>
        
        <div className="mb-4">
          <div className="text-4xl font-bold text-muted-foreground">
            ~${roundedInhouseTotal.toLocaleString()}
            <span className="text-lg font-normal text-muted-foreground/70">/mo</span>
          </div>
          <div className="text-sm text-muted-foreground/70 mt-1">
            ${inhousePerUser}/user/month
          </div>
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          <p className="mb-2">Equivalent in-house team:</p>
          <ul className="space-y-1">
            {inhouseBreakdown.serviceDesk > 0 && (
              <li>• {inhouseBreakdown.serviceDesk.toFixed(2)} × Service Desk</li>
            )}
            {inhouseBreakdown.sysAdmin > 0 && (
              <li>• {inhouseBreakdown.sysAdmin.toFixed(2)} × Systems Administrator</li>
            )}
            {inhouseBreakdown.manager > 0 && (
              <li>• {inhouseBreakdown.manager.toFixed(2)} × IT Manager</li>
            )}
          </ul>
        </div>

        {savings > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
            <TrendingDown className="w-4 h-4" />
            Save {savingsPercent}% (~${Math.round(savings / 100) * 100}/mo)
          </div>
        )}

        <button
          onClick={() => setShowInhouseAssumptions(!showInhouseAssumptions)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
        >
          {showInhouseAssumptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          View assumptions
        </button>
        
        {showInhouseAssumptions && (
          <div className="mt-3 p-3 bg-card rounded-lg text-xs text-muted-foreground space-y-1 border border-border">
            <p>• SD ratio: 1 per {inhouseConfig?.service_desk_per_users || 'N/A'} users (min 1 FTE)</p>
            <p>• SysAdmin ratio: {inhouseConfig?.sys_admin_per_users 
              ? `1 per ${inhouseConfig.sys_admin_per_users} users` 
              : 'N/A (not included in this tier)'}</p>
            <p>• IT Manager: {inhouseBreakdown.manager.toFixed(2)} FTE (~{(inhouseBreakdown.manager * 5).toFixed(2)} days/week)</p>
            <p>• Salaries: Australian market mid-points (SEEK) + 12% super</p>
            <p>• Total on-costs: ~24% (super, WorkCover, other)</p>
            <p>• Excludes: tooling, training, recruitment, leave coverage</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPanel;
