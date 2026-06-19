import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { TierManagement } from "@/components/cost-calculator/admin/TierManagement";
import { TierFeatureManagement } from "@/components/cost-calculator/admin/TierFeatureManagement";
import { CompanySizeManagement } from "@/components/cost-calculator/admin/CompanySizeManagement";
import { SalaryManagement } from "@/components/cost-calculator/admin/SalaryManagement";
import { InhouseConfigManagement } from "@/components/cost-calculator/admin/InhouseConfigManagement";
import { GlobalSettingsManagement } from "@/components/cost-calculator/admin/GlobalSettingsManagement";

const CostCalculatorSettingsPage = () => {
  const navigate = useNavigate();
  const { userRole, loading } = useAuth();

  // Redirect non-admins
  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      toast({
        title: "Access denied",
        description: "This page is only accessible to administrators",
        variant: "destructive",
      });
      navigate('/cost-calculator');
    }
  }, [userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-full mx-auto py-12 animate-in fade-in duration-500 slide-in-from-bottom-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/cost-calculator')}
            className="hover:bg-green-50 dark:hover:bg-green-950 hover:text-green-700 dark:hover:text-green-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              Cost Calculator Settings
            </h1>
          </div>
        </div>

        {/* Settings Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl border-t-4 border-t-green-600">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Configuration</CardTitle>
            <CardDescription>
              Manage all calculator data: pricing tiers, features, company sizes, salaries, and global settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tiers" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="tiers">Tiers</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="sizes">Sizes</TabsTrigger>
                <TabsTrigger value="salaries">Salaries</TabsTrigger>
                <TabsTrigger value="fte">FTE Ratios</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="tiers">
                <TierManagement />
              </TabsContent>
              <TabsContent value="features">
                <TierFeatureManagement />
              </TabsContent>
              <TabsContent value="sizes">
                <CompanySizeManagement />
              </TabsContent>
              <TabsContent value="salaries">
                <SalaryManagement />
              </TabsContent>
              <TabsContent value="fte">
                <InhouseConfigManagement />
              </TabsContent>
              <TabsContent value="settings">
                <GlobalSettingsManagement />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CostCalculatorSettingsPage;
