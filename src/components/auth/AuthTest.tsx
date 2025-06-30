/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const AuthTest = () => {
  const { isAuthenticated, user, session } = useAuth();
  const [dbTest, setDbTest] = useState<string>('');

  useEffect(() => {
    const testDatabaseAccess = async () => {
      try {
        // Skip database test for demo user
        if (user?.email === 'demo@chalmers.se') {
          setDbTest('Demo mode: Database access simulated');
          return;
        }

        const { data, error } = await supabase
          .from('materials')
          .select('count')
          .single();

        if (error) {
          setDbTest(`Database access failed: ${error.message}`);
        } else {
          setDbTest(`Database access successful! Materials count: ${data?.count ?? 0}`);
        }
      } catch (err) {
        setDbTest(`Error testing database: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    if (isAuthenticated) {
      testDatabaseAccess();
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
          <Alert severity={dbTest.includes('successful') || dbTest.includes('simulated') ? "success" : "error"}>
            {dbTest}
          </Alert>
        </>
      )}
    </Box>
  );
};

export default AuthTest;