import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, ClipboardCheck, Mail } from "lucide-react";
const HelpSection: React.FC = () => {
  return <Card>
      <CardHeader>
        <CardTitle>Need Help?</CardTitle>
        <CardDescription>Contact our team for assistance with different types of issues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600 flex-shrink-0" />
              App Function Issues
            </h3>
            <div className="space-y-3">
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium flex-shrink-0">Chinh:</span>
                </div>
                <div className="ml-6">
                  <a href="mailto:chinh@comansservices.com.au" className="text-blue-600 hover:underline text-sm break-words">
                    chinh@comansservices.com.au
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
              Billing Issues
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium flex-shrink-0">Jason:</span>
                </div>
                <div className="ml-6">
                  <a href="mailto:Jason.Comeau@comansservices.com.au" className="text-blue-600 hover:underline text-sm break-words">
                    Jason.Comeau@comansservices.com.au
                  </a>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium flex-shrink-0">Belinda:</span>
                </div>
                <div className="ml-6">
                  <a href="mailto:Belinda.Comeau@comansservices.com.au" className="text-blue-600 hover:underline text-sm break-words">
                    Belinda.Comeau@comansservices.com.au
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
};
export default HelpSection;