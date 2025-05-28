import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ParsedData } from '../types/simulation';

interface SimulationContextType {
  uploadedFiles: File[];
  parsedData: ParsedData | null;
  setUploadedFiles: (files: File[]) => void;
  setParsedData: (data: ParsedData | null) => void;
  clearSimulationData: () => void;
}

const SimulationContext = createContext<SimulationContextType>({
  uploadedFiles: [],
  parsedData: null,
  setUploadedFiles: () => {},
  setParsedData: () => {},
  clearSimulationData: () => {},
});

export const useSimulation = () => useContext(SimulationContext);

interface SimulationProviderProps {
  children: ReactNode;
}

export const SimulationProvider = ({ children }: SimulationProviderProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);

  const clearSimulationData = () => {
    setUploadedFiles([]);
    setParsedData(null);
  };

  return (
    <SimulationContext.Provider 
      value={{
        uploadedFiles,
        parsedData,
        setUploadedFiles,
        setParsedData,
        clearSimulationData,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};