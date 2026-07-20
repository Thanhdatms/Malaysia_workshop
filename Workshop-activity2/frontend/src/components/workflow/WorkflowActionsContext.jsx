import { createContext, useContext } from 'react';

const WorkflowActionsContext = createContext(null);

export function WorkflowActionsProvider({ value, children }) {
  return <WorkflowActionsContext.Provider value={value}>{children}</WorkflowActionsContext.Provider>;
}

export function useWorkflowActions() {
  const ctx = useContext(WorkflowActionsContext);
  if (!ctx) throw new Error('useWorkflowActions must be used within WorkflowActionsProvider');
  return ctx;
}
