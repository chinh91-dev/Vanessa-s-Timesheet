import { useState, useCallback } from 'react';
import { OHSValidationService } from '@/lib/ohs/validation-service';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const useOHSValidation = () => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateHazardReport = useCallback((data: any): ValidationResult => {
    const result = OHSValidationService.validateHazardReport(data);
    setValidationErrors(result.errors);
    return result;
  }, []);

  const validateWorkplaceInspection = useCallback((data: any): ValidationResult => {
    const result = OHSValidationService.validateWorkplaceInspection(data);
    setValidationErrors(result.errors);
    return result;
  }, []);

  const validateInjuryRegister = useCallback((data: any): ValidationResult => {
    const result = OHSValidationService.validateInjuryRegister(data);
    setValidationErrors(result.errors);
    return result;
  }, []);

  const calculateRiskRating = useCallback((likelihood: string, consequence: string): number => {
    return OHSValidationService.calculateRiskRating(likelihood, consequence);
  }, []);

  const getRiskCategory = useCallback((rating: number) => {
    return OHSValidationService.getRiskCategory(rating);
  }, []);

  const hasPermission = useCallback((userRole: string, action: string, entityType: string): boolean => {
    return OHSValidationService.hasPermission(userRole, action, entityType);
  }, []);

  const clearValidationErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  return {
    validationErrors,
    validateHazardReport,
    validateWorkplaceInspection,
    validateInjuryRegister,
    calculateRiskRating,
    getRiskCategory,
    hasPermission,
    clearValidationErrors,
  };
};