import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TransactionHistory, ActivityLogEntry } from '@shared/schema';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

export default function History() {
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [date, setDate] = useState<Date>();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const logs = await api.getActivityLogs();
        setActivityLogs(logs);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const formatDate = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return format(date, 'MMM dd, yyyy HH:mm:ss');
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">History</h1>
        
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="activity">Activity Logs</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="arbitrage">Arbitrage History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Activity Logs</CardTitle>
                    <CardDescription>System activity and events</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {}}>
                    Export Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Timestamp</TableHead>
                          <TableHead className="w-[100px]">Type</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLogs.length > 0 ? (
                          activityLogs.map((log, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-xs">
                                {formatDate(log.timestamp)}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    log.type === 'error' 
                                      ? 'destructive' 
                                      : log.type === 'warning' 
                                        ? 'outline' 
                                        : 'default'
                                  }
                                >
                                  {log.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{log.message}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                              No activity logs found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>All executed transactions</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select 
                      value={transactionFilter} 
                      onValueChange={setTransactionFilter}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="arbitrage">Arbitrage</SelectItem>
                        <SelectItem value="snipe">Token Snipe</SelectItem>
                        <SelectItem value="copyTrade">Copy Trade</SelectItem>
                        <SelectItem value="autoTrade">Auto Trade</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[160px] pl-3 text-left font-normal">
                          {date ? format(date, 'PPP') : 'Filter by date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 text-center py-8">
                  Transaction history coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="arbitrage">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Arbitrage History</CardTitle>
                    <CardDescription>Past arbitrage opportunities and executions</CardDescription>
                  </div>
                  <Input placeholder="Search token..." className="max-w-xs" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 text-center py-8">
                  Arbitrage history coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
}