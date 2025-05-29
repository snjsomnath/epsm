import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DatabaseProvider } from './context/DatabaseContext';
import { SimulationProvider } from './context/SimulationContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './components/auth/LoginPage';
import HomePage from './components/home/HomePage';
import DatabasePage from './components/database/DatabasePage';
import BaselinePage from './components/baseline/BaselinePage';
import ScenarioPage from './components/scenario/ScenarioPage';
import SimulationPage from './components/simulation/SimulationPage';
import ResultsPage from './components/results/ResultsPage';
import ExportPage from './components/export/ExportPage';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <DatabaseProvider>
            <SimulationProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="database/*" element={<DatabasePage />} />
                  <Route path="baseline" element={<BaselinePage />} />
                  <Route path="scenario" element={<ScenarioPage />} />
                  <Route path="simulation" element={<SimulationPage />} />
                  <Route path="results" element={<ResultsPage />} />
                  <Route path="export" element={<ExportPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </SimulationProvider>
          </DatabaseProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;