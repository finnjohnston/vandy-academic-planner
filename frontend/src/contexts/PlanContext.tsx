import React, { createContext, useContext, useState, useEffect } from 'react';

interface PlanContextType {
  plannedCourses: any[];
  setPlannedCourses?: (courses: any[]) => void;
}

export const PlanContext = createContext<PlanContextType>({
  plannedCourses: []
});

export const PlanProvider: React.FC<{
  children: React.ReactNode;
  value?: any[];
}> = ({ children, value }) => {
  const [plannedCourses, setPlannedCourses] = useState<any[]>(value || []);

  // Sync with prop value when it changes
  useEffect(() => {
    if (value) {
      setPlannedCourses(value);
    }
  }, [value]);

  return (
    <PlanContext.Provider value={{ plannedCourses, setPlannedCourses }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlanContext = () => useContext(PlanContext);
