/**
 * Phase 2 Component Usage Examples
 *
 * This file demonstrates how to migrate existing dialogs and selectors
 * to use the new reusable components.
 *
 * DO NOT DELETE - Reference for migration
 */

import React from 'react';
import { useFormDialog } from '@/hooks/useFormDialog';
import { GenericFormDialog, GenericConfirmDialog, GenericDeleteDialog } from './dialogs';
import { AsyncCombobox, FormCombobox } from './selectors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * ============================================================================
 * EXAMPLE 1: Simple Form Dialog (Create/Edit)
 * ============================================================================
 * Before: 60-80 lines of boilerplate
 * After: 20-30 lines
 */

interface Project {
  id: string;
  name: string;
  description: string;
}

export function ProjectDialogExample() {
  // ✅ Replace 8+ useState calls with one hook
  const dialog = useFormDialog<Project>();

  const handleSubmit = async (data: Project) => {
    // Your API call here
    await saveProject(data);
  };

  return (
    <>
      <Button onClick={dialog.openCreate}>Create Project</Button>

      <GenericFormDialog
        open={dialog.isOpen}
        onOpenChange={dialog.close}
        entity={dialog.entity}
        title={(entity) => (entity ? 'Edit Project' : 'Create Project')}
        submitLabel={(entity) => (entity ? 'Save Changes' : 'Create Project')}
        onSubmit={handleSubmit}
        onSuccess={() => console.log('Success!')}
      >
        {({ entity, isCreate }) => (
          <>
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={entity?.name}
                required
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                defaultValue={entity?.description}
                placeholder="Enter description"
              />
            </div>
          </>
        )}
      </GenericFormDialog>
    </>
  );
}

/**
 * ============================================================================
 * EXAMPLE 2: Delete Confirmation Dialog
 * ============================================================================
 * Before: 40-50 lines of boilerplate
 * After: 10-15 lines
 */

export function ProjectDeleteExample() {
  const dialog = useFormDialog<Project>();

  const handleDelete = async (project: Project) => {
    await deleteProject(project.id);
  };

  return (
    <>
      <Button variant="destructive" onClick={() => dialog.openDelete({ id: '1', name: 'Test Project', description: '' })}>
        Delete
      </Button>

      <GenericDeleteDialog
        open={dialog.isOpen && dialog.mode === 'delete'}
        onOpenChange={dialog.close}
        entity={dialog.entity!}
        entityName="Project"
        onConfirm={handleDelete}
      />
    </>
  );
}

/**
 * ============================================================================
 * EXAMPLE 3: Custom Confirmation Dialog
 * ============================================================================
 */

export function ApprovalConfirmExample() {
  const [open, setOpen] = React.useState(false);

  const handleApprove = async () => {
    await approveLeaveRequest();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Approve Leave</Button>

      <GenericConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Approve Leave Request"
        description="Are you sure you want to approve this leave request?"
        confirmText="Approve"
        variant="default"
        onConfirm={handleApprove}
      />
    </>
  );
}

/**
 * ============================================================================
 * EXAMPLE 4: Combobox with Static Options
 * ============================================================================
 * Replaces: ProjectSelector, ContractSelector, etc.
 * Before: 95-140 lines per selector
 * After: Use GenericCombobox directly
 */

export function StatusSelectorExample() {
  const [status, setStatus] = React.useState<string | null>(null);

  return (
    <FormCombobox
      name="status"
      label="Project Status"
      value={status}
      onValueChange={(value) => setStatus(value as string)}
      options={[
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Archived', value: 'archived' },
      ]}
      placeholder="Select status..."
      required
    />
  );
}

/**
 * ============================================================================
 * EXAMPLE 5: Async Combobox (Load from API)
 * ============================================================================
 * Replaces: ProjectSelector with API loading
 * Before: 140+ lines
 * After: ~20 lines
 */

export function ProjectSelectorExample() {
  const [projectId, setProjectId] = React.useState<string | null>(null);

  return (
    <AsyncCombobox
      queryKey={['projects', 'active']}
      queryFn={async () => {
        // Your API call
        return await fetchProjects();
      }}
      getOption={(project) => ({
        label: project.name,
        value: project.id,
        description: project.description || '',
      })}
      value={projectId}
      onValueChange={(value) => setProjectId(value as string)}
      placeholder="Select project..."
      searchPlaceholder="Search projects..."
      emptyMessage="No projects found."
      label="Project"
      required
    />
  );
}

/**
 * ============================================================================
 * EXAMPLE 6: Migration Pattern for Existing Dialogs
 * ============================================================================
 * How to migrate AddEditContractDialog.tsx (850 lines) to use new patterns
 */

/*
// BEFORE (simplified):
export function AddEditContractDialog({ contract, open, onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Contract) => {
    setIsSubmitting(true);
    try {
      await saveContract(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contract ? 'Edit' : 'Create'} Contract</DialogTitle>
        </DialogHeader>
        {error && <Alert>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          // 700+ lines of form fields
        </form>
        <DialogFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={isSubmitting}>
            {isSubmitting && <Loader2 />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// AFTER (using GenericFormDialog):
export function AddEditContractDialog({ contract, open, onClose }) {
  const handleSubmit = async (data: Contract) => {
    await saveContract(data);
  };

  return (
    <GenericFormDialog
      open={open}
      onOpenChange={onClose}
      entity={contract}
      title={(c) => (c ? 'Edit Contract' : 'Create Contract')}
      maxWidth="max-w-4xl"
      onSubmit={handleSubmit}
    >
      {({ entity }) => (
        // 700+ lines of form fields (moved to separate components)
        <>
          <ContractBasicInfoSection defaultValues={entity} />
          <ContractServicesSection defaultValues={entity} />
          <ContractAssignmentsSection defaultValues={entity} />
        </>
      )}
    </GenericFormDialog>
  );
}
*/

/**
 * ============================================================================
 * MIGRATION CHECKLIST
 * ============================================================================
 *
 * When migrating an existing dialog:
 *
 * 1. ✅ Replace useState(open) with useFormDialog hook
 * 2. ✅ Replace Dialog + DialogContent with GenericFormDialog
 * 3. ✅ Remove manual isSubmitting/error state management
 * 4. ✅ Remove manual DialogFooter - handled by GenericFormDialog
 * 5. ✅ Extract large form sections into separate components
 * 6. ✅ Replace custom selectors with GenericCombobox or AsyncCombobox
 * 7. ✅ Use FormCombobox for react-hook-form integration
 * 8. ✅ Test that all functionality still works
 *
 * Estimated time savings per dialog: 30-40 lines of boilerplate code
 */

// Dummy functions for example
async function saveProject(data: Project) {}
async function deleteProject(id: string) {}
async function approveLeaveRequest() {}
async function fetchProjects(): Promise<Project[]> {
  return [];
}
async function saveContract(data: any) {}
