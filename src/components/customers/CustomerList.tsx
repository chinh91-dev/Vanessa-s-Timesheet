
import React from "react";
import { Customer } from "@/lib/customer-service";
import CustomerCard from "./CustomerCard";

interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDoubleRightClick: (customer: Customer, event: React.MouseEvent) => void;
  onManageLogins?: (customer: Customer) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ 
  customers, 
  onEdit, 
  onDoubleRightClick,
  onManageLogins
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {customers.map((customer) => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          onEdit={onEdit}
          onDoubleRightClick={onDoubleRightClick}
          onManageLogins={onManageLogins}
        />
      ))}
    </div>
  );
};

export default CustomerList;
