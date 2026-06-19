
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CompanyNews: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Company News & Announcements</CardTitle>
        <CardDescription>Stay up-to-date with the latest company information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-6 text-center text-gray-500 border border-dashed rounded-md">
          No company announcements available at this time.
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyNews;
