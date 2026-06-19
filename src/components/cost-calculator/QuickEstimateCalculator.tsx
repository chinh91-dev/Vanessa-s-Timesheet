import { useState, useMemo } from "react";
import { Calculator, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TierButton from "./TierButton";
import SecurityAddonCard from "./SecurityAddonCard";
import ResultsPanel from "./ResultsPanel";
import {
  useCostCalculatorTiers,
  useCostCalculatorCompanySizes,
  useCostCalculatorInhouseConfig,
  useCostCalculatorSalaries,
  useCostCalculatorSettings,
} from "@/hooks/useCostCalculatorData";

const QuickEstimateCalculator = () => {
  const { data: tiers, isLoading: tiersLoading } = useCostCalculatorTiers();
  const { data: companySizes, isLoading: sizesLoading } = useCostCalculatorCompanySizes();
  const { data: inhouseConfig, isLoading: inhouseLoading } = useCostCalculatorInhouseConfig();
  const { data: salaries, isLoading: salariesLoading } = useCostCalculatorSalaries();
  const { data: settings, isLoading: settingsLoading } = useCostCalculatorSettings();

  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [securityAddon, setSecurityAddon] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [useCustomUsers, setUseCustomUsers] = useState(false);
  const [customUserCount, setCustomUserCount] = useState<string>("50");

  const isLoading = tiersLoading || sizesLoading || inhouseLoading || salariesLoading || settingsLoading;

  // Set defaults when data loads
  useMemo(() => {
    if (companySizes?.length && !selectedSizeId) {
      // Default to "Small" (second option) or first
      const defaultSize = companySizes.find(s => s.label === 'Small') || companySizes[0];
      setSelectedSizeId(defaultSize.id);
    }
    if (tiers?.length && !selectedTierId) {
      // Default to "Managed" (growth) or second tier
      const defaultTier = tiers.find(t => t.tier_key === 'growth') || tiers[1] || tiers[0];
      setSelectedTierId(defaultTier.id);
    }
  }, [companySizes, tiers, selectedSizeId, selectedTierId]);

  const selectedSize = companySizes?.find(s => s.id === selectedSizeId);
  const selectedTier = tiers?.find(t => t.id === selectedTierId);
  const tierInhouseConfig = inhouseConfig?.find(c => c.tier_id === selectedTierId);

  // Determine the actual user count to use in calculations
  const effectiveUserCount = useMemo(() => {
    if (useCustomUsers) {
      const parsed = parseInt(customUserCount, 10);
      if (isNaN(parsed)) return 0;
      return Math.max(1, Math.min(1000, parsed));
    }
    return selectedSize?.default_users || 0;
  }, [useCustomUsers, customUserCount, selectedSize]);

  // Get settings values
  const securityAddonRate = parseFloat(settings?.security_addon_rate || '30');
  const superRate = parseFloat(settings?.super_rate || '0.12');
  const workCoverRate = parseFloat(settings?.work_cover_rate || '0.018');
  const otherOncostRate = parseFloat(settings?.other_oncost_rate || '0.10');
  const minManagerFte = parseFloat(settings?.min_manager_fte || '0.2');
  const volumeDiscount50 = parseFloat(settings?.volume_discount_50 || '0.10');
  const volumeDiscount100 = parseFloat(settings?.volume_discount_100 || '0.15');

  // Calculate Comans pricing
  const calculateComans = useMemo(() => {
    if (!selectedTier || effectiveUserCount === 0) return { total: 0, perUser: 0, volumeDiscount: 0 };

    const userCount = effectiveUserCount;
    let baseRate = selectedTier.rate_per_user;
    
    // Add security addon if selected and not included
    if (securityAddon && !selectedTier.security_included) {
      baseRate += securityAddonRate;
    }

    // Calculate volume discount
    let volumeDiscount = 0;
    if (userCount >= 100) {
      volumeDiscount = volumeDiscount100;
    } else if (userCount >= 50) {
      volumeDiscount = volumeDiscount50;
    }

    const discountedRate = baseRate * (1 - volumeDiscount);
    let total = userCount * discountedRate;

    // Apply minimum monthly
    total = Math.max(total, selectedTier.min_monthly);

    return {
      total,
      perUser: Math.round(discountedRate),
      volumeDiscount,
    };
  }, [effectiveUserCount, selectedTier, securityAddon, securityAddonRate, volumeDiscount50, volumeDiscount100]);

  // Calculate in-house costs
  const calculateInhouse = useMemo(() => {
    if (!tierInhouseConfig || !salaries || effectiveUserCount === 0) {
      return { total: 0, breakdown: { serviceDesk: 0, sysAdmin: 0, manager: 0 } };
    }

    const userCount = effectiveUserCount;
    const oncostMultiplier = 1 + superRate + workCoverRate + otherOncostRate;

    const getSalary = (roleKey: string) => {
      const salary = salaries.find(s => s.role_key === roleKey);
      return salary ? salary.annual_salary : 0;
    };

    // Calculate FTEs based on ratios (matching HTML logic)
    // Service Desk: minimum 1 FTE, rounded up
    const serviceDeskFte = tierInhouseConfig.service_desk_per_users > 0 
      ? Math.max(1, Math.ceil(userCount / tierInhouseConfig.service_desk_per_users))
      : 0;
    
    // SysAdmin: rounded up (no minimum)
    const sysAdminFte = tierInhouseConfig.sys_admin_per_users && tierInhouseConfig.sys_admin_per_users > 0
      ? Math.ceil(userCount / tierInhouseConfig.sys_admin_per_users)
      : 0;
    
    // Manager: clamped between minManagerFte and 1.0 (max 1 FTE)
    let managerFte = tierInhouseConfig.manager_per_users > 0 
      ? userCount / tierInhouseConfig.manager_per_users 
      : 0;
    managerFte = Math.min(Math.max(managerFte, minManagerFte), 1.0);

    // Calculate monthly costs
    const serviceDeskCost = (getSalary('service_desk') * oncostMultiplier * serviceDeskFte) / 12;
    const sysAdminCost = (getSalary('sys_admin') * oncostMultiplier * sysAdminFte) / 12;
    const managerCost = (getSalary('it_manager') * oncostMultiplier * managerFte) / 12;

    return {
      total: serviceDeskCost + sysAdminCost + managerCost,
      breakdown: {
        serviceDesk: serviceDeskFte,
        sysAdmin: sysAdminFte,
        manager: managerFte,
      },
    };
  }, [effectiveUserCount, tierInhouseConfig, salaries, superRate, workCoverRate, otherOncostRate, minManagerFte]);

  const handleGetEstimate = () => {
    setShowResults(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tiers?.length || !companySizes?.length) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Calculator configuration not available.</p>
        <p className="text-sm mt-2">Please contact an administrator to set up the pricing data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Company Size Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Company size
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {companySizes.map((size) => (
            <TierButton
              key={size.id}
              label={size.label}
              subLabel={size.sub_label}
              isActive={selectedSizeId === size.id && !useCustomUsers}
              onClick={() => {
                setSelectedSizeId(size.id);
                setUseCustomUsers(false);
                setShowResults(false);
              }}
            />
          ))}
          {/* Custom option */}
          <TierButton
            label="Custom"
            subLabel="Enter users"
            isActive={useCustomUsers}
            onClick={() => {
              setUseCustomUsers(true);
              setShowResults(false);
            }}
          />
        </div>

        {/* Custom user input field */}
        {useCustomUsers && (
          <div className="mt-4 max-w-xs">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Number of users
            </label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={customUserCount}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                setCustomUserCount(e.target.value);
                setShowResults(false);
              }}
              onBlur={(e) => {
                const parsed = parseInt(e.target.value, 10);
                const clamped = isNaN(parsed) ? 50 : Math.max(1, Math.min(1000, parsed));
                setCustomUserCount(clamped.toString());
              }}
              className="text-lg font-semibold"
              placeholder="Enter number of users"
            />
          </div>
        )}
      </div>

      {/* Service Tier Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Service level
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tiers.map((tier) => (
            <TierButton
              key={tier.id}
              label={tier.label}
              subLabel={tier.sub_label}
              isActive={selectedTierId === tier.id}
              onClick={() => {
                setSelectedTierId(tier.id);
                setSecurityAddon(false);
                setShowResults(false);
              }}
            />
          ))}
        </div>
      </div>

      {/* Security Add-on */}
      <SecurityAddonCard
        isActive={securityAddon}
        isIncluded={selectedTier?.security_included || false}
        addonRate={securityAddonRate}
        onClick={() => {
          if (!selectedTier?.security_included) {
            setSecurityAddon(!securityAddon);
            setShowResults(false);
          }
        }}
      />

      {/* Get Estimate Button */}
      <div className="text-center">
        <Button
          onClick={handleGetEstimate}
          size="lg"
          className="px-8 py-6 text-lg font-semibold bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 shadow-[0_4px_15px_rgba(22,163,74,0.3)] hover:shadow-[0_6px_20px_rgba(22,163,74,0.5)] transition-all hover:-translate-y-0.5"
        >
          <Calculator className="w-5 h-5 mr-2" />
          Get Estimate
        </Button>
      </div>

      {/* Results */}
      {showResults && selectedTier && tierInhouseConfig && effectiveUserCount > 0 && (
        <ResultsPanel
          comansTotal={calculateComans.total}
          perUserRate={calculateComans.perUser}
          tier={selectedTier}
          userCount={effectiveUserCount}
          securityAddon={securityAddon}
          securityAddonRate={securityAddonRate}
          inhouseTotal={calculateInhouse.total}
          inhouseBreakdown={calculateInhouse.breakdown}
          volumeDiscount={calculateComans.volumeDiscount}
          inhouseConfig={tierInhouseConfig}
          salaries={salaries}
        />
      )}

      {/* Tooling Note */}
      <p className="text-center text-muted-foreground text-sm">
        Typical tooling: Microsoft 365, Intune, Defender for Endpoint, Entra ID, Veeam/Zerto.
      </p>
    </div>
  );
};

export default QuickEstimateCalculator;
