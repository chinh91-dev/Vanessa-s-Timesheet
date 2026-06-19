
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import CSVImportDialog from "./CSVImportDialog";
import { EntityType } from "@/lib/csv-import-service";

interface ImportButtonProps {
  entityType: EntityType;
  onImportComplete: () => void;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
}

const ImportButton: React.FC<ImportButtonProps> = ({
  entityType,
  onImportComplete,
  className,
  variant = "outline",
  size = "default"
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const entityLabels = {
    projects: 'Projects',
    customers: 'Customers',
    contracts: 'Contracts',
    'team-members': 'Team Members'
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsDialogOpen(true)}
        className={className}
      >
        <Upload className="h-4 w-4 mr-2" />
        Import CSV
      </Button>

      <CSVImportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityType={entityType}
        onImportComplete={() => {
          onImportComplete();
          setIsDialogOpen(false);
        }}
      />
    </>
  );
};

export default ImportButton;
