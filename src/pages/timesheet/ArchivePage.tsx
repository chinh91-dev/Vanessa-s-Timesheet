import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Archive, FolderKanban, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchProjects, updateProject, updateProjectStatus } from "@/lib/timesheet/project-service";
import { fetchContracts, updateContract, deleteContract } from "@/lib/contract-service";
import { Project } from "@/lib/timesheet/types";
import { Contract } from "@/lib/contract-service";
import ProjectList from "@/components/projects/ProjectList";
import ContractList from "@/components/contracts/ContractList";
import AddEditProjectDialog from "@/components/projects/AddEditProjectDialog";
import AddEditContractDialog from "@/components/contracts/AddEditContractDialog";
import DeleteProjectDialog from "@/components/projects/DeleteProjectDialog";
import DeleteContractDialog from "@/components/contracts/DeleteContractDialog";
import ProjectAssignmentDialog from "@/components/projects/ProjectAssignmentDialog";
import ContractAssignmentDialog from "@/components/contracts/ContractAssignmentDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const ArchivePage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("projects");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [assignmentProject, setAssignmentProject] = useState<Project | null>(null);
  const [assignmentContract, setAssignmentContract] = useState<Contract | null>(null);

  // Dialog open states
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isEditContractOpen, setIsEditContractOpen] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
  const [isDeleteContractOpen, setIsDeleteContractOpen] = useState(false);
  const [isProjectAssignmentOpen, setIsProjectAssignmentOpen] = useState(false);
  const [isContractAssignmentOpen, setIsContractAssignmentOpen] = useState(false);

  // Fetch archived projects
  const { 
    data: archivedProjects = [], 
    isLoading: projectsLoading, 
    error: projectsError,
    refetch: refetchProjects 
  } = useQuery({
    queryKey: ["archived-projects", searchTerm],
    queryFn: () => fetchProjects({ 
      searchTerm: searchTerm || undefined,
      statusFilter: 'inactive'
    }),
    enabled: true,
  });

  // Fetch archived contracts
  const { 
    data: archivedContracts = [], 
    isLoading: contractsLoading, 
    error: contractsError,
    refetch: refetchContracts 
  } = useQuery({
    queryKey: ["archived-contracts", searchTerm],
    queryFn: () => fetchContracts({ 
      searchTerm: searchTerm || undefined,
      isActive: false
    }),
    enabled: true,
  });

  const handleRefresh = () => {
    if (activeTab === "projects") {
      refetchProjects();
    } else {
      refetchContracts();
    }
    toast({
      title: "Refreshed",
      description: "Archive data has been refreshed.",
    });
  };

  // Reactivation mutations
  const reactivateProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await updateProjectStatus(projectId, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Project Reactivated",
        description: "The project has been reactivated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error reactivating project:", error);
      toast({
        title: "Error",
        description: "Failed to reactivate project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reactivateContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      await updateContract(contractId, { is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({
        title: "Contract Reactivated",
        description: "The contract has been reactivated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error reactivating contract:", error);
      toast({
        title: "Error",
        description: "Failed to reactivate contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsEditProjectOpen(true);
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setIsEditContractOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteProjectOpen(true);
  };

  const handleDeleteContract = (contract: Contract) => {
    setContractToDelete(contract);
    setIsDeleteContractOpen(true);
  };

  const handleReactivateProject = (project: Project) => {
    reactivateProjectMutation.mutate(project.id);
  };

  const handleReactivateContract = (contract: Contract) => {
    reactivateContractMutation.mutate(contract.id);
  };

  const handleManageProjectAssignments = (project: Project) => {
    setAssignmentProject(project);
    setIsProjectAssignmentOpen(true);
  };

  const handleManageContractAssignments = (contract: Contract) => {
    setAssignmentContract(contract);
    setIsContractAssignmentOpen(true);
  };

  const closeProjectEditDialog = () => {
    setIsEditProjectOpen(false);
    setEditingProject(null);
    refetchProjects();
  };

  const closeContractEditDialog = () => {
    setIsEditContractOpen(false);
    setEditingContract(null);
    refetchContracts();
  };

  const closeProjectDeleteDialog = () => {
    setIsDeleteProjectOpen(false);
    setProjectToDelete(null);
    refetchProjects();
  };

  const closeContractDeleteDialog = () => {
    setIsDeleteContractOpen(false);
    setContractToDelete(null);
    refetchContracts();
  };

  // Calculate statistics
  const projectStats = {
    total: archivedProjects.length,
    internal: archivedProjects.filter(p => p.is_internal).length,
    client: archivedProjects.filter(p => !p.is_internal).length,
  };

  const contractStats = {
    total: archivedContracts.length,
    expired: archivedContracts.filter(c => c.status === 'expired').length,
    renewed: archivedContracts.filter(c => c.status === 'renewed').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Archive className="h-8 w-8" />
            Archive
          </h1>
          <p className="text-muted-foreground">
            Manage archived projects and contracts
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search archived items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button onClick={handleRefresh} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error alerts */}
      {projectsError && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading archived projects: {projectsError.message}
          </AlertDescription>
        </Alert>
      )}

      {contractsError && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading archived contracts: {contractsError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {projectStats.internal} internal, {projectStats.client} client
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contractStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {contractStats.expired} expired, {contractStats.renewed} renewed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Projects and Contracts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Projects ({projectStats.total})
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contracts ({contractStats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Archived Projects</CardTitle>
              <CardDescription>
                Projects that have been archived and are no longer active
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="flex justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : archivedProjects.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No archived projects found</p>
                  {searchTerm && (
                    <p className="text-sm">Try adjusting your search criteria</p>
                  )}
                </div>
              ) : (
                <ProjectList
                  projects={archivedProjects}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProject}
                  onToggleStatus={handleReactivateProject}
                  onManageAssignments={handleManageProjectAssignments}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Archived Contracts</CardTitle>
              <CardDescription>
                Contracts that have been archived and are no longer active
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <div className="flex justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : archivedContracts.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No archived contracts found</p>
                  {searchTerm && (
                    <p className="text-sm">Try adjusting your search criteria</p>
                  )}
                </div>
              ) : (
                <ContractList
                  contracts={archivedContracts}
                  onEdit={handleEditContract}
                  onDelete={handleDeleteContract}
                  onToggleStatus={handleReactivateContract}
                  onManageAssignments={handleManageContractAssignments}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddEditProjectDialog
        isOpen={isEditProjectOpen}
        onClose={closeProjectEditDialog}
        existingProject={editingProject}
      />

      <AddEditContractDialog
        isOpen={isEditContractOpen}
        onClose={closeContractEditDialog}
        existingContract={editingContract}
      />

      {projectToDelete && (
        <DeleteProjectDialog
          isOpen={isDeleteProjectOpen}
          onClose={closeProjectDeleteDialog}
          project={projectToDelete}
        />
      )}

      {contractToDelete && (
        <DeleteContractDialog
          isOpen={isDeleteContractOpen}
          onClose={closeContractDeleteDialog}
          contract={contractToDelete}
        />
      )}

      <ProjectAssignmentDialog
        project={assignmentProject}
        open={isProjectAssignmentOpen}
        onOpenChange={setIsProjectAssignmentOpen}
      />

      <ContractAssignmentDialog
        contract={assignmentContract}
        open={isContractAssignmentOpen}
        onOpenChange={setIsContractAssignmentOpen}
      />
    </div>
  );
};

export default ArchivePage;