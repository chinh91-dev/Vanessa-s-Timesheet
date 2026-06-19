import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Calculator, Settings, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";
import QuickEstimateCalculator from "@/components/cost-calculator/QuickEstimateCalculator";

const ALLOWED_ROLES = ['admin', 'manager', 'sale_manager', 'sale_user'];

const CostCalculatorPage = () => {
  const navigate = useNavigate();
  const { userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && !ALLOWED_ROLES.includes(userRole || '')) {
      toast({
        title: "Access denied",
        description: "You don't have permission to access the Cost Calculator",
        variant: "destructive",
      });
      navigate('/timesheet');
    }
  }, [userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ALLOWED_ROLES.includes(userRole || '')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-12 animate-in fade-in duration-500 slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calculator className="h-7 w-7 text-green-600" />
          <h1 className="text-2xl font-bold text-foreground">
            Quick Estimate Calculator
          </h1>
        </div>
        {userRole === 'admin' && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/cost-calculator/settings')}
            className="border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Description */}
      <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
        Get a quick estimate now. We will confirm final pricing after a short discovery and a Statement of Work (SOW).
      </p>

      {/* Calculator Container */}
      <div className="bg-card border border-green-200 dark:border-green-800 rounded-lg p-6 md:p-8 shadow-sm">
        <QuickEstimateCalculator />
      </div>
    </div>
  );
};

export default CostCalculatorPage;
