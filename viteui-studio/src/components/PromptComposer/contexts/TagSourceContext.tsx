import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useWorkspaceState } from '../../../contexts/WorkspaceContext';

interface TagSourceContextType {
  tagSource: string;
  setTagSource: (source: string) => void;
}

const TagSourceContext = createContext<TagSourceContextType | undefined>(undefined);

export const TagSourceProvider: React.FC<{ children: ReactNode; workspaceId?: string | null }> = ({ children, workspaceId = null }) => {
  const { workspaceState, updateWorkspaceState } = useWorkspaceState(workspaceId);
  
  const tagSource = workspaceState.ui.tagSource || 'Danbooru';

  const setTagSource = useCallback((source: string) => {
    updateWorkspaceState((prev) => {
      return {
        ...prev,
        ui: {
          ...prev.ui,
          tagSource: source
        }
      };
    });
  }, [updateWorkspaceState]);

  return (
    <TagSourceContext.Provider value={{ tagSource, setTagSource }}>
      {children}
    </TagSourceContext.Provider>
  );
};

export const useTagSource = () => {
  const context = useContext(TagSourceContext);
  if (context === undefined) {
    throw new Error('useTagSource must be used within a TagSourceProvider');
  }
  return context;
};
