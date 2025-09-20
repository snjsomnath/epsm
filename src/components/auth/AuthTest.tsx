import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { authenticatedFetch } from '../../lib/auth-api';
import { useAuth } from '../../context/AuthContext';

const AuthTest = () => {
  const { isAuthenticated, user, session } = useAuth();
  const [apiTest, setApiTest] = useState<string>('');

  useEffect(() => {
    const testAPIAccess = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await authenticatedFetch(`${API_BASE_URL}/api/test/`);

        if (response.ok) {
          const data = await response.json();
          setApiTest(`API access successful! Message: ${data.message || 'Connected'}`);
        } else {
          setApiTest(`API access failed: HTTP ${response.status}`);
        }
      } catch (err) {
        setApiTest(`Error testing API: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    if (isAuthenticated) {
      testAPIAccess();
    }
  }, [isAuthenticated, user]);

  return (
    <Box sx={{ mt: 2 }}>
      <Alert severity={isAuthenticated ? "success" : "warning"} sx={{ mb: 1 }}>
        Authentication Status: {isAuthenticated ? "Authenticated" : "Not Authenticated"}
      </Alert>
      
      {isAuthenticated && (
        <>
          <Typography variant="body2" sx={{ mb: 1 }}>
            User ID: {user?.id}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Email: {user?.email}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Session Valid: {session ? "Yes" : "No"}
          </Typography>
          <Alert severity={apiTest.includes('successful') ? "success" : "error"}>
            {apiTest}
          </Alert>
        </>
      )}
    </Box>
  );
};

export default AuthTest;