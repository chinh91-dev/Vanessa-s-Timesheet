import { useAuth } from "@/context/AuthContext";

/**
 * Hook to check user's employment type
 * 
 * Employment categories:
 * - Permanent: full-time, part-time (have full access including leave)
 * - Non-permanent: temporary, casual (restricted access)
 */
export const useEmploymentType = () => {
  const { employmentType } = useAuth();

  const isFullTime = employmentType === "full-time";
  const isPartTime = employmentType === "part-time";
  const isTemporary = employmentType === "temporary";
  const isCasual = employmentType === "casual";
  const isFixedTerm = employmentType === "fixed-term";

  // Permanent = full-time, part-time, or fixed-term (have full access)
  const isPermanent = isFullTime || isPartTime || isFixedTerm;

  // Casual/Temp = temporary or casual (restricted access)
  const isCasualOrTemp = isTemporary || isCasual;

  return {
    employmentType,
    isFullTime,
    isPartTime,
    isTemporary,
    isCasual,
    isFixedTerm,
    isPermanent,
    isCasualOrTemp,
  };
};
