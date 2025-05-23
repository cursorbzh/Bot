import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ApiStatus } from '@shared/schema';
import * as api from '@/lib/api';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Connections() {
  const [apiStatuses, setApiStatuses] = useState<Record<string, ApiStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await api.getSystemStatus();
        if (status && status.apiConnections) {
          setApiStatuses(status.apiConnections);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching API statuses:', error);
        setLoading(false);
      }
    };

    fetchStatus();
    
    // Refresh every 30 seconds
    const intervalId = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const getStatusColor = (connected: boolean) => {
    return connected ? 'bg-green-500' : 'bg-red-500';
  };

  const handleTestConnection = async (serviceName: string) => {
    // In a real implementation, this would trigger a test connection 
    // to the specific service through the API
    console.log(`Testing connection to ${serviceName}...`);
  };

  const renderServiceCard = (key: string, status: ApiStatus) => (
    <Card key={key} className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{status.name}</CardTitle>
          <Badge 
            variant={status.connected ? "default" : "destructive"}
            className={status.connected ? "bg-green-500 hover:bg-green-500 font-normal" : "font-normal"}
          >
            {status.connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <CardDescription>
          {status.connected 
            ? `${status.requestsPerSecond || 0} requests/sec` 
            : status.errorMessage || 'Not connected'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {status.connected && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Rate Limit Usage</span>
                <span>{status.rateLimit ? `${status.rateLimit}` : 'Unknown'}</span>
              </div>
              <Progress value={status.requestsPerSecond ? (status.requestsPerSecond / 10) * 100 : 0} className="h-1.5" />
            </div>
          )}
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => handleTestConnection(key)}
            >
              Test Connection
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">API Connections</h1>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="logs">Connection Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(apiStatuses).map(([key, status]) => 
                  renderServiceCard(key, status)
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>API Connection Settings</CardTitle>
                  <CardDescription>Configure API rate limits and retry strategies</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    API Connection settings coming soon
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle>Connection Logs</CardTitle>
                  <CardDescription>View recent API connection events and errors</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Connection logs coming soon
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
      
      <Footer />
    </div>
  );
}