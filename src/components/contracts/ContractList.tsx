
import React, { useState, useRef } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  Trash2, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Building,
  FileText,
  Eye,
  ExternalLink,
  Download
} from "lucide-react";
import { Contract } from "@/lib/contract-service";
import { formatDate } from "@/lib/date-utils";
import ContractAssignmentDialog from "./ContractAssignmentDialog";

interface ContractListProps {
  contracts: Contract[];
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
  onToggleStatus?: (contract: Contract) => void;
  onManageAssignments?: (contract: Contract) => void;
  readOnly?: boolean;
}

const ContractList: React.FC<ContractListProps> = ({ 
  contracts, 
  onEdit, 
  onDelete,
  onToggleStatus,
  onManageAssignments,
  readOnly = false
}) => {
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const lastRightClickTime = useRef<number>(0);
  const lastRightClickedContract = useRef<string | null>(null);
  const lastLeftClickTime = useRef<number>(0);
  const lastLeftClickedContract = useRef<string | null>(null);

  const handleManageAssignments = (contract: Contract) => {
    if (onManageAssignments) {
      onManageAssignments(contract);
    } else {
      setSelectedContract(contract);
      setAssignmentDialogOpen(true);
    }
  };

  const handleDoubleRightClick = (contract: Contract, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent context menu
    
    // Only allow editing if not read-only
    if (readOnly) return;
    
    const currentTime = Date.now();
    const timeDiff = currentTime - lastRightClickTime.current;
    
    // Check if this is a double right-click (within 500ms and same contract)
    if (timeDiff < 500 && lastRightClickedContract.current === contract.id) {
      onEdit(contract);
      lastRightClickTime.current = 0; // Reset to prevent triple clicks
      lastRightClickedContract.current = null;
    } else {
      lastRightClickTime.current = currentTime;
      lastRightClickedContract.current = contract.id;
    }
  };

  const handleDoubleLeftClick = (contract: Contract, event: React.MouseEvent) => {
    // Only allow editing if not read-only
    if (readOnly) return;
    
    const currentTime = Date.now();
    const timeDiff = currentTime - lastLeftClickTime.current;
    
    // Check if this is a double left-click (within 500ms and same contract)
    if (timeDiff < 500 && lastLeftClickedContract.current === contract.id) {
      onEdit(contract);
      lastLeftClickTime.current = 0; // Reset to prevent triple clicks
      lastLeftClickedContract.current = null;
    } else {
      lastLeftClickTime.current = currentTime;
      lastLeftClickedContract.current = contract.id;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'pending_renewal': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'expired': return 'bg-red-100 text-red-800 border-red-300';
      case 'renewed': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'pending_renewal': return <AlertTriangle className="h-4 w-4" />;
      case 'expired': return <Clock className="h-4 w-4" />;
      case 'renewed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleViewDocument = (contract: Contract, event: React.MouseEvent) => {
    event.stopPropagation();
    if (contract.file_url) {
      window.open(contract.file_url, '_blank');
    }
  };

  if (contracts.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">No contracts found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contracts.map((contract) => (
          <Card 
            key={contract.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onContextMenu={(e) => handleDoubleRightClick(contract, e)}
            onClick={(e) => handleDoubleLeftClick(contract, e)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold">{contract.name}</CardTitle>
                  {contract.file_name && (
                    <div title={`Document: ${contract.file_name}`}>
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(contract.status)} flex items-center gap-1`}
                >
                  {getStatusIcon(contract.status)}
                  {contract.status.replace('_', ' ')}
                </Badge>
              </div>
              {contract.description && (
                <CardDescription className="text-sm">{contract.description}</CardDescription>
              )}
              {contract.file_name && (
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{contract.file_name}</span>
                  {contract.file_size && (
                    <span className="text-gray-400">
                      ({(contract.file_size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  )}
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-3">
              {contract.customer_name && (
                <div className="flex items-center text-sm text-gray-600">
                  <Building className="h-4 w-4 mr-2" />
                  {contract.customer_name}
                </div>
              )}
              
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>
                  {formatDate(new Date(contract.start_date))} - {formatDate(new Date(contract.end_date))}
                </span>
              </div>

              {contract.days_until_expiry !== undefined && (
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className={
                    contract.days_until_expiry < 0 
                      ? "text-red-600" 
                      : contract.days_until_expiry <= 30 
                        ? "text-orange-600" 
                        : "text-green-600"
                  }>
                    {contract.days_until_expiry < 0 
                      ? `Expired ${Math.abs(contract.days_until_expiry)} days ago`
                      : contract.days_until_expiry === 0
                        ? "Expires today"
                        : `${contract.days_until_expiry} days until expiry`
                    }
                  </span>
                </div>
              )}

              {contract.services && contract.services.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {contract.services.slice(0, 3).map((service) => (
                    <Badge key={service.id} variant="secondary" className="text-xs">
                      {service.name}
                    </Badge>
                  ))}
                  {contract.services.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{contract.services.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="pt-3 flex gap-2 flex-wrap">
              {contract.file_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleViewDocument(contract, e)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Document
                </Button>
              )}
              
              {!readOnly ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManageAssignments(contract);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Users className="h-4 w-4" />
                    Assign
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(contract);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  {onToggleStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(contract);
                      }}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Reactivate
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(contract);
                    }}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManageAssignments(contract);
                  }}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-4 w-4" />
                  View Assignments
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <ContractAssignmentDialog
        contract={selectedContract}
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        readOnly={readOnly}
      />
    </>
  );
};

export default ContractList;
