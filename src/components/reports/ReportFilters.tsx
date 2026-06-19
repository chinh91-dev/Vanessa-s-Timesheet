
import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeFilter } from "./filters/DateRangeFilter";
import { SelectFilters } from "./filters/SelectFilters";
import { FilterActions } from "./filters/FilterActions";
import { FilterToggles } from "./filters/FilterToggles";
import { fetchProjects, Project, Contract, fetchUserContracts } from "@/lib/timesheet-service";
import { fetchCustomers, Customer } from "@/lib/customer-service";
import { fetchUsers, User } from "@/lib/user-service";
import { getAuditActionTypes } from "@/lib/audit/audit-service";
import { useReportGeneration } from "./filters/hooks/useReportGeneration";
import { ReportFiltersType } from "@/pages/timesheet/ReportsPage";

interface ReportFiltersProps {
  filters: ReportFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<ReportFiltersType>>;
  setReportData: React.Dispatch<React.SetStateAction<any[]>>;
  setAuditData: React.Dispatch<React.SetStateAction<any[]>>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReportFilters = ({
  filters,
  setFilters,
  setReportData,
  setAuditData,
  setProjects,
  setContracts,
  setCustomers,
  setUsers,
  setIsLoading,
}: ReportFiltersProps) => {
  const [projects, setProjectsLocal] = React.useState<Project[]>([]);
  const [contracts, setContractsLocal] = React.useState<Contract[]>([]);
  const [customers, setCustomersLocal] = React.useState<Customer[]>([]);
  const [users, setUsersLocal] = React.useState<User[]>([]);
  const [actionTypes, setActionTypes] = React.useState<string[]>([]);

  const { generateReport, isGeneratingReport } = useReportGeneration({
    filters,
    setReportData,
    setAuditData,
    setIsLoading
  });

  // Load dropdown data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, contractsData, customersData, usersData, actionTypesData] = await Promise.all([
          fetchProjects(),
          fetchUserContracts(),
          fetchCustomers(),
          fetchUsers(),
          getAuditActionTypes()
        ]);

        setProjectsLocal(projectsData);
        setContractsLocal(contractsData);
        setCustomersLocal(customersData);
        setUsersLocal(usersData);
        setActionTypes(actionTypesData);

        // Pass data to parent
        setProjects(projectsData);
        setContracts(contractsData);
        setCustomers(customersData);
        setUsers(usersData);
      } catch (error) {
        console.error("Error loading filter data:", error);
      }
    };

    loadData();
  }, [setProjects, setContracts, setCustomers, setUsers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DateRangeFilter filters={filters} setFilters={setFilters} />
        
        <FilterToggles filters={filters} setFilters={setFilters} />
        
        <SelectFilters
          filters={filters}
          setFilters={setFilters}
          projects={projects}
          contracts={contracts}
          customers={customers}
          users={users}
          actionTypes={actionTypes}
        />
        
        <FilterActions
          generateReport={generateReport}
          isGeneratingReport={isGeneratingReport}
        />
      </CardContent>
    </Card>
  );
};

export default ReportFilters;
