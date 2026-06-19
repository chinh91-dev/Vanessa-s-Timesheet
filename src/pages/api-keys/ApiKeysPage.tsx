import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApiKeyList from "@/components/api-keys/ApiKeyList";
import CreateApiKeyDialog from "@/components/api-keys/CreateApiKeyDialog";
import ApiDocsPanel from "@/components/api-keys/ApiDocsPanel";
import { Key, BookOpen } from "lucide-react";

const ApiKeysPage = () => {
  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
        <p className="text-muted-foreground mt-1">
          Manage API keys for external bots and integrations
        </p>
      </div>

      <Tabs defaultValue="keys" className="w-full">
        <TabsList>
          <TabsTrigger value="keys" className="gap-2">
            <Key className="h-4 w-4" />
            Keys
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <BookOpen className="h-4 w-4" />
            API Docs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Generate and manage keys for bot/agent access
                </CardDescription>
              </div>
              <CreateApiKeyDialog />
            </CardHeader>
            <CardContent>
              <ApiKeyList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <ApiDocsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiKeysPage;
