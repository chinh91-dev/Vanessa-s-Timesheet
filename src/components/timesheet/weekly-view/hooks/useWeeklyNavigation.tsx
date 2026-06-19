
import { useState, useCallback, useMemo } from "react";
import {
  getCurrentWeekDates,
  getNextWeek,
  getPreviousWeek,
  getNextDay,
  getPreviousDay,
} from "@/lib/date-utils";

export const useWeeklyNavigation = (viewMode: "today" | "week") => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  // Update week dates when current date changes
  const updateWeekDates = useCallback(() => {
    const dates = getCurrentWeekDates(currentDate);
    setWeekDates(dates);
  }, [currentDate]);

  // Navigation functions that handle both day and week navigation
  const navigateToPrevious = useCallback(() => {
    if (viewMode === "today") {
      setCurrentDate(getPreviousDay(currentDate));
    } else {
      setCurrentDate(getPreviousWeek(currentDate));
    }
  }, [currentDate, viewMode]);

  const navigateToNext = useCallback(() => {
    if (viewMode === "today") {
      setCurrentDate(getNextDay(currentDate));
    } else {
      setCurrentDate(getNextWeek(currentDate));
    }
  }, [currentDate, viewMode]);

  const navigateToCurrentWeek = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  return {
    currentDate,
    setCurrentDate,
    weekDates,
    setWeekDates,
    updateWeekDates,
    navigateToPrevious,
    navigateToNext,
    navigateToCurrentWeek,
  };
};
