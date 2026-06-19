
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Shield, ShieldCheck } from "lucide-react";

const HolidayLegend: React.FC = () => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Day Types Legend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Today */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span>Today</span>
          </div>
          
          {/* Weekend */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Weekend</span>
          </div>
          
          {/* Holiday - Allowed */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Holiday - Allowed</span>
          </div>
          
          {/* Holiday - Blocked */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Holiday - Blocked</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="text-blue-800 bg-blue-50 border-blue-200">
              <Clock className="h-3 w-3 mr-1" />
              Weekend Entry
            </Badge>
            <Badge variant="outline" className="text-purple-800 bg-purple-50 border-purple-200">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Holiday Entry Allowed
            </Badge>
            <Badge variant="outline" className="text-red-800 bg-red-50 border-red-200">
              <Shield className="h-3 w-3 mr-1" />
              Holiday Entry Blocked
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HolidayLegend;
