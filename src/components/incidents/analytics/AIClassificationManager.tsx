import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { IncidentAnalyticsService } from "@/lib/analytics/incident-analytics-service";
import { useIncidentCategories, useIncidentPriorities } from "@/hooks/useIncidents";
import { Brain, Plus, Trash2, Edit, TestTube } from "lucide-react";
import { toast } from "sonner";

export function AIClassificationManager() {
  const [testTitle, setTestTitle] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [newKeyword, setNewKeyword] = useState({
    keyword: "",
    category_id: "",
    priority_id: "",
    weight: 1.0,
    confidence_score: 0.5
  });
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);

  const queryClient = useQueryClient();
  const { data: categories } = useIncidentCategories();
  const { data: priorities } = useIncidentPriorities();

  const { data: keywords, isLoading } = useQuery({
    queryKey: ['incident-keywords'],
    queryFn: IncidentAnalyticsService.getIncidentKeywords,
  });

  const { data: classificationResult, mutate: testClassification, isPending: isClassifying } = useMutation({
    mutationFn: ({ title, description }: { title: string; description: string }) =>
      IncidentAnalyticsService.classifyIncident(title, description),
  });

  const addKeywordMutation = useMutation({
    mutationFn: IncidentAnalyticsService.addKeyword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-keywords'] });
      setNewKeyword({
        keyword: "",
        category_id: "",
        priority_id: "",
        weight: 1.0,
        confidence_score: 0.5
      });
      setIsAddingKeyword(false);
      toast.success("Keyword added successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to add keyword: " + error.message);
    },
  });

  const deleteKeywordMutation = useMutation({
    mutationFn: IncidentAnalyticsService.deleteKeyword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-keywords'] });
      toast.success("Keyword deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete keyword: " + error.message);
    },
  });

  const handleTestClassification = () => {
    if (!testTitle.trim()) {
      toast.error("Please enter a title to test");
      return;
    }
    testClassification({ title: testTitle, description: testDescription });
  };

  const handleAddKeyword = () => {
    if (!newKeyword.keyword.trim()) {
      toast.error("Please enter a keyword");
      return;
    }
    addKeywordMutation.mutate(newKeyword);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCategoryName = (categoryId: string) => {
    return categories?.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  const getPriorityName = (priorityId: string) => {
    return priorities?.find(p => p.id === priorityId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">AI Classification Manager</h3>
        <p className="text-muted-foreground">
          Manage keywords and test AI-powered incident classification
        </p>
      </div>

      {/* Test Classification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Classification
          </CardTitle>
          <CardDescription>
            Test how the AI would classify an incident
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test-title">Incident Title</Label>
              <Input
                id="test-title"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Enter incident title..."
              />
            </div>
            <div>
              <Label htmlFor="test-description">Description (Optional)</Label>
              <Textarea
                id="test-description"
                value={testDescription}
                onChange={(e) => setTestDescription(e.target.value)}
                placeholder="Enter incident description..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleTestClassification}
              disabled={isClassifying || !testTitle.trim()}
            >
              {isClassifying ? "Classifying..." : "Test Classification"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setTestTitle("");
                setTestDescription("");
              }}
            >
              Clear
            </Button>
          </div>

          {classificationResult && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Classification Result:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Suggested Category:</span>
                  <Badge variant="outline">
                    {classificationResult.suggested_category_id 
                      ? getCategoryName(classificationResult.suggested_category_id)
                      : "None detected"
                    }
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Suggested Priority:</span>
                  <Badge variant="outline">
                    {classificationResult.suggested_priority_id 
                      ? getPriorityName(classificationResult.suggested_priority_id)
                      : "None detected"
                    }
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Confidence:</span>
                  <div className="flex items-center gap-1">
                    <div 
                      className={`w-2 h-2 rounded-full ${getConfidenceColor(classificationResult.confidence_score)}`}
                    />
                    <span className="text-sm">
                      {Math.round(classificationResult.confidence_score * 100)}%
                    </span>
                  </div>
                </div>
                {classificationResult.matching_keywords.length > 0 && (
                  <div>
                    <span className="text-sm">Matching Keywords:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {classificationResult.matching_keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keywords Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Classification Keywords
          </CardTitle>
          <CardDescription>
            Manage keywords that help AI classify incidents
          </CardDescription>
          <div>
            <Dialog open={isAddingKeyword} onOpenChange={setIsAddingKeyword}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Keyword
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Classification Keyword</DialogTitle>
                  <DialogDescription>
                    Add a keyword that helps AI classify incidents
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyword">Keyword</Label>
                    <Input
                      id="keyword"
                      value={newKeyword.keyword}
                      onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                      placeholder="e.g., 'server down', 'login issue'"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Select
                      value={newKeyword.category_id}
                      onValueChange={(value) => setNewKeyword({ ...newKeyword, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority (Optional)</Label>
                    <Select
                      value={newKeyword.priority_id}
                      onValueChange={(value) => setNewKeyword({ ...newKeyword, priority_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {priorities?.map((priority) => (
                          <SelectItem key={priority.id} value={priority.id}>
                            {priority.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weight">Weight</Label>
                      <Input
                        id="weight"
                        type="number"
                        min="0.1"
                        max="5.0"
                        step="0.1"
                        value={newKeyword.weight}
                        onChange={(e) => setNewKeyword({ ...newKeyword, weight: parseFloat(e.target.value) || 1.0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="confidence">Confidence</Label>
                      <Input
                        id="confidence"
                        type="number"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={newKeyword.confidence_score}
                        onChange={(e) => setNewKeyword({ ...newKeyword, confidence_score: parseFloat(e.target.value) || 0.5 })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleAddKeyword}
                      disabled={addKeywordMutation.isPending}
                    >
                      {addKeywordMutation.isPending ? "Adding..." : "Add Keyword"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddingKeyword(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : keywords && keywords.length > 0 ? (
            <div className="space-y-2">
              {keywords.map((keyword) => (
                <div key={keyword.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {keyword.keyword}
                    </Badge>
                    {keyword.category?.name && (
                      <Badge variant="secondary">
                        Cat: {keyword.category.name}
                      </Badge>
                    )}
                    {keyword.priority?.name && (
                      <Badge variant="secondary">
                        Pri: {keyword.priority.name}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span>Weight: {keyword.weight}</span>
                      <span>•</span>
                      <span>Used: {keyword.usage_count}x</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div 
                        className={`w-2 h-2 rounded-full ${getConfidenceColor(keyword.confidence_score)}`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {Math.round(keyword.confidence_score * 100)}%
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteKeywordMutation.mutate(keyword.id)}
                      disabled={deleteKeywordMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No keywords configured yet. Add keywords to improve AI classification.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}