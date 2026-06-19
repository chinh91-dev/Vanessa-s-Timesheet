
// Main export file that re-exports all timesheet functionality
import { Project, TimesheetEntry, CreateTimesheetEntry, UpdateTimesheetEntry } from "./timesheet/types";
import { ProjectAssignment, CreateProjectAssignment, ProjectWithAssignees } from "./project/assignment-types";
import { ContractAssignment, CreateContractAssignment, ContractWithAssignees } from "./contract/assignment-types";
import { Contract, ContractTimeEntry, fetchServices, fetchUserContracts, updateContract } from "./contract-service";
import { 
  fetchUserProjects, 
  getProjectHoursUsed, 
  updateProjectStatus,
  updateProject,
  fetchProjects,
  fetchProjectsWithAssignees,
  saveProject
} from "./timesheet/project-service";
import { 
  fetchTimesheetEntries,
  fetchReportData,
  saveTimesheetEntry,
  duplicateTimesheetEntry,
  deleteTimesheetEntry,
  deleteAllTimesheetEntries
} from "./timesheet/entry-service";
import {
  fetchProjectAssignments,
  createProjectAssignment,
  deleteProjectAssignment,
  bulkAssignUsersToProject,
  removeUserFromProject
} from "./project/assignment-service";
import {
  fetchContractAssignments,
  createContractAssignment,
  deleteContractAssignment,
  bulkAssignUsersToContract,
  removeUserFromContract
} from "./contract/assignment-service";

// Re-export all types and functions
export type { 
  Project, 
  TimesheetEntry, 
  CreateTimesheetEntry, 
  UpdateTimesheetEntry, 
  Contract, 
  ContractTimeEntry,
  ProjectAssignment,
  CreateProjectAssignment,
  ProjectWithAssignees,
  ContractAssignment,
  CreateContractAssignment,
  ContractWithAssignees
};

export {
  // Project related functions
  fetchUserProjects,
  fetchProjects,
  fetchProjectsWithAssignees,
  saveProject,
  updateProject,
  getProjectHoursUsed,
  updateProjectStatus,
  
  // Entry related functions
  fetchTimesheetEntries,
  fetchReportData,
  saveTimesheetEntry,
  duplicateTimesheetEntry,
  deleteTimesheetEntry,
  deleteAllTimesheetEntries,
  
  // Project assignment related functions
  fetchProjectAssignments,
  createProjectAssignment,
  deleteProjectAssignment,
  bulkAssignUsersToProject,
  removeUserFromProject,
  
  // Contract assignment related functions
  fetchContractAssignments,
  createContractAssignment,
  deleteContractAssignment,
  bulkAssignUsersToContract,
  removeUserFromContract,
  
  // Contract related functions
  fetchServices,
  fetchUserContracts,
  updateContract
};
