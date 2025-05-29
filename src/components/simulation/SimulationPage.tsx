import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play } from 'lucide-react';

const SimulationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulation</CardTitle>
          <CardDescription>
            Run and manage your building energy simulations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Active Simulations</TabsTrigger>
              <TabsTrigger value="history">Simulation History</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Active Simulations</h3>
                <Button onClick={() => navigate('/baseline')}>
                  <Play className="mr-2 h-4 w-4" />
                  New Simulation
                </Button>
              </div>
              {/* Active simulations list will go here */}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <h3 className="text-lg font-semibold">Simulation History</h3>
              {/* Simulation history list will go here */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimulationPage;