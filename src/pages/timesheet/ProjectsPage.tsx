
import React, { useState, useEffect } from "react";
import { todayLocalYMD } from "@/lib/date-utils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Clock, BarChart3, Users, Search, Filter, RefreshCw, Building, Infinity, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Project } from "@/lib/timesheet/types";
import { fetchProjects, updateProjectStatus } from "@/lib/timesheet/project-service";
import { fetchCustomers } from "@/lib/customer-service";
import ProjectList from "@/components/projects/ProjectList";
import AddEditProjectDialog from "@/components/projects/AddEditProjectDialog";
import DeleteProjectDialog from "@/components/projects/DeleteProjectDialog";
import ProjectAssignmentDialog from "@/components/projects/ProjectAssignmentDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ImportButton from "@/components/common/ImportButton";
import { useProjectRealtime } from "@/hooks/useProjectRealtime";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ProjectsPage = () => {
  const { user } = useAuth();
  
  // Enable real-time updates for projects
  useProjectRealtime();
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [assignmentProject, setAssignmentProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | 'internal' | 'client'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [budgetFilter, setBudgetFilter] = useState<string>('');
  const [startDateFrom, setStartDateFrom] = useState<string>('');
  const [startDateTo, setStartDateTo] = useState<string>('');
  const [endDateFrom, setEndDateFrom] = useState<string>('');
  const [endDateTo, setEndDateTo] = useState<string>('');

  const { 
    data: projects = [], 
    isLoading, 
    refetch,
    error
  } = useQuery({
    queryKey: ["projects", searchTerm, statusFilter, typeFilter, selectedCustomer, budgetFilter, startDateFrom, startDateTo, endDateFrom, endDateTo],
    queryFn: () => fetchProjects({ 
      searchTerm: searchTerm.trim() || undefined,
      statusFilter: statusFilter,
      typeFilter: typeFilter,
      customerId: selectedCustomer || undefined,
      budgetFilter: budgetFilter || undefined,
      startDateFrom: startDateFrom || undefined,
      startDateTo: startDateTo || undefined,
      endDateFrom: endDateFrom || undefined,
      endDateTo: endDateTo || undefined
    }),
    enabled: !!user
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
    enabled: !!user
  });

  useEffect(() => {
    if (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error fetching projects",
        description: "There was an issue loading your projects. Please try again.",
        variant: "destructive",
      });
    }
  }, [error]);

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsAddProjectOpen(true);
  };
  
  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteProjectOpen(true);
  };

  const handleManageAssignments = (project: Project) => {
    setAssignmentProject(project);
    setIsAssignmentDialogOpen(true);
  };

  const handleToggleStatus = async (project: Project) => {
    try {
      const newStatus = !project.is_active;
      await updateProjectStatus(project.id, newStatus);
      
      toast({
        title: "Project Status Updated",
        description: `Project "${project.name}" has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
      
      refetch();
    } catch (error) {
      console.error("Error updating project status:", error);
      toast({
        title: "Error",
        description: "Failed to update project status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const closeAddEditDialog = () => {
    setIsAddProjectOpen(false);
    setEditingProject(null);
    refetch();
  };

  const closeDeleteDialog = () => {
    setIsDeleteProjectOpen(false);
    setProjectToDelete(null);
    refetch();
  };

  const closeAssignmentDialog = () => {
    setIsAssignmentDialogOpen(false);
    setAssignmentProject(null);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('active');
    setTypeFilter('all');
    setSelectedCustomer('');
    setBudgetFilter('');
    setStartDateFrom('');
    setStartDateTo('');
    setEndDateFrom('');
    setEndDateTo('');
  };

  const calculateProjectStats = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.is_active).length;
    const internalProjects = projects.filter(p => p.is_internal).length;
    const clientProjects = projects.filter(p => !p.is_internal).length;
    const budgetLimitedProjects = projects.filter(p => p.has_budget_limit !== false).length;
    const unlimitedBudgetProjects = projects.filter(p => p.has_budget_limit === false).length;
    
    // Only calculate budget stats for projects with budget limits
    const projectsWithBudgets = projects.filter(p => p.has_budget_limit !== false);
    const totalBudgetHours = projectsWithBudgets.reduce((sum, p) => sum + (p.budget_hours || 0), 0);
    const avgBudgetHours = projectsWithBudgets.length > 0 ? totalBudgetHours / projectsWithBudgets.length : 0;
    
    return {
      totalProjects,
      activeProjects,
      internalProjects,
      clientProjects,
      budgetLimitedProjects,
      unlimitedBudgetProjects,
      totalBudgetHours,
      avgBudgetHours: Math.round(avgBudgetHours)
    };
  };

  const stats = calculateProjectStats();

  // Active projects with a past end_date - these need to be archived
  const today = todayLocalYMD();
  const expiredActiveProjects = statusFilter === 'active' || statusFilter === 'all'
    ? projects.filter(p => p.is_active && p.end_date && p.end_date < today)
    : [];

  return (
    <div className="container-responsive max-w-none">
      {/* Warning banner for active projects with past end dates */}
      {expiredActiveProjects.length > 0 && (
        <Alert className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <span className="font-medium text-orange-800 dark:text-orange-400">
              {expiredActiveProjects.length} project{expiredActiveProjects.length > 1 ? 's' : ''} still active but past end date:
            </span>{' '}
            <span className="text-orange-700 dark:text-orange-300">
              {expiredActiveProjects.map(p => p.name).join(', ')}
            </span>
            {' — '}
            <span className="text-orange-700 dark:text-orange-300">
              These projects are hidden from the timesheet dropdown. Archive them to prevent any confusion.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Header with better responsive layout */}
      <div className="mb-fluid-md">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-fluid-sm">
          <div className="min-w-0 flex-1">
            <h1 className="text-fluid-2xl font-bold truncate">Projects</h1>
            <p className="text-fluid-sm text-gray-600 mt-1">
              Manage and monitor project budgets
            </p>
          </div>
          
          {/* Action buttons with smart responsive behavior */}
          <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:gap-3">
            <ImportButton
              entityType="projects"
              onImportComplete={refetch}
              variant="outline"
              className="flex-shrink-0"
            />
            
            <Button 
              onClick={() => refetch()}
              variant="outline"
              title="Refresh projects"
              className="flex-shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
            
            <Button 
              onClick={() => setIsAddProjectOpen(true)} 
              className="flex items-center gap-2 flex-shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Add Project</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced search and filter controls with responsive stacking */}
      <div className="mb-fluid-md">
        <div className="flex flex-col gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          {/* Quick filter dropdowns */}
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'all' | 'internal' | 'client')}>
              <SelectTrigger className="w-[140px]">
                <Building className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={clearAllFilters}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>

          {/* Advanced Filters Accordion */}
          <Accordion type="single" collapsible>
            <AccordionItem value="advanced-filters">
              <AccordionTrigger className="text-sm font-medium">
                Advanced Filters
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Customer Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Customer
                    </label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger>
                        <SelectValue placeholder="All customers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All customers</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Budget Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Budget Type
                    </label>
                    <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All budget types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All budget types</SelectItem>
                        <SelectItem value="limited">Budget Limited</SelectItem>
                        <SelectItem value="unlimited">Unlimited Budget</SelectItem>
                        <SelectItem value="over_budget">Over Budget</SelectItem>
                        <SelectItem value="under_budget">Under Budget</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Date Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Start Date Range
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={startDateFrom}
                        onChange={(e) => setStartDateFrom(e.target.value)}
                        placeholder="From"
                        className="text-sm"
                      />
                      <Input
                        type="date"
                        value={startDateTo}
                        onChange={(e) => setStartDateTo(e.target.value)}
                        placeholder="To"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* End Date Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      End Date Range
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={endDateFrom}
                        onChange={(e) => setEndDateFrom(e.target.value)}
                        placeholder="From"
                        className="text-sm"
                      />
                      <Input
                        type="date"
                        value={endDateTo}
                        onChange={(e) => setEndDateTo(e.target.value)}
                        placeholder="To"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Enhanced stats grid with ultra-responsive behavior */}
      {!isLoading && projects.length > 0 && (
        <div className="mb-fluid-md">
          <div className="
            grid gap-fluid-sm
            grid-cols-1 
            xs:grid-cols-2 
            md:grid-cols-2 
            lg:grid-cols-4 
            xl:grid-cols-4 
            2xl:grid-cols-4
            3xl:grid-cols-6 
            4xl:grid-cols-6
            container-query
          ">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-fluid-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="truncate">Total Projects</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-fluid-xl font-bold text-blue-600">{stats.totalProjects}</div>
                <p className="text-fluid-xs text-muted-foreground mt-1">
                  {stats.activeProjects} active
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-fluid-lg flex items-center gap-2">
                  <Building className="h-5 w-5 text-purple-600" />
                  <span className="truncate">Internal</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-fluid-xl font-bold text-purple-600">{stats.internalProjects}</div>
                <p className="text-fluid-xs text-muted-foreground mt-1">
                  Company projects
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-fluid-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="truncate">Client</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-fluid-xl font-bold text-green-600">{stats.clientProjects}</div>
                <p className="text-fluid-xs text-muted-foreground mt-1">
                  Customer projects
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-fluid-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="truncate">Budget Limited</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-fluid-xl font-bold text-orange-600">{stats.budgetLimitedProjects}</div>
                <p className="text-fluid-xs text-muted-foreground mt-1">
                  With budget limits
                </p>
              </CardContent>
            </Card>

            {/* Additional stats for ultra-wide screens */}
            <Card className="hover:shadow-md transition-shadow hidden 3xl:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-fluid-lg flex items-center gap-2">
                  <Infinity className="h-5 w-5 text-indigo-600" />
                  <span className="truncate">Unlimited</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-fluid-xl font-bold text-indigo-600">{stats.unlimitedBudgetProjects}</div>
                <p className="text-fluid-xs text-muted-foreground mt-1">
                  No budget limits
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow hidden 3xl:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-fluid-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-pink-600" />
                  <span className="truncate">Avg Budget</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-fluid-xl font-bold text-pink-600">{stats.avgBudgetHours}h</div>
                <p className="text-fluid-xs text-muted-foreground mt-1">
                  Per limited project
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Project list card with enhanced responsive content */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-fluid-lg">All Projects</CardTitle>
            <CardDescription className="text-fluid-sm">
              Manage your project budgets and timelines
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {projects.length > 0 && (
              <span className="text-fluid-xs text-muted-foreground whitespace-nowrap">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-fluid-sm lg:p-fluid-md">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Clock className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : projects.length > 0 ? (
            <ProjectList 
              projects={projects} 
              onEdit={handleEditProject} 
              onDelete={handleDeleteClick}
              onToggleStatus={handleToggleStatus}
              onManageAssignments={handleManageAssignments}
            />
          ) : (
            <div className="p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No projects found</p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddProjectOpen(true)}
                >
                  Add Your First Project
                </Button>
                <div className="text-sm text-muted-foreground">
                  or <ImportButton entityType="projects" onImportComplete={refetch} variant="ghost" size="sm" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AddEditProjectDialog 
        isOpen={isAddProjectOpen} 
        onClose={closeAddEditDialog} 
        existingProject={editingProject}
      />
      
      {projectToDelete && (
        <DeleteProjectDialog 
          isOpen={isDeleteProjectOpen}
          onClose={closeDeleteDialog}
          project={projectToDelete}
        />
      )}

      <ProjectAssignmentDialog
        project={assignmentProject}
        open={isAssignmentDialogOpen}
        onOpenChange={closeAssignmentDialog}
      />
    </div>
  );
};

export default ProjectsPage;
