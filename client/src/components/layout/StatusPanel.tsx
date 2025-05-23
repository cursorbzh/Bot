import React, { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { SystemStatus, ActivityLogEntry, ApiStatus } from '@shared/schema';

interface StatusPanelProps {
  systemStatus: SystemStatus;
  activityLogs: ActivityLogEntry[];
  onExportLogs: () => void;
  onReportIssue: () => void;
}

export function StatusPanel({ 
  systemStatus, 
  activityLogs,
  onExportLogs,
  onReportIssue
}: StatusPanelProps) {
  const logsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to the bottom when new logs come in
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [activityLogs]);

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Map log type to CSS class
  const getLogClass = (type: string) => {
    switch (type) {
      case 'success': return 'text-success';
      case 'error': return 'text-danger';
      case 'warning': return 'text-warning';
      default: return 'text-textmuted';
    }
  };

  return (
    <div className="w-64 bg-surface border-l border-gray-800 flex flex-col overflow-hidden relative">
      <div className="p-3 border-b border-gray-800">
        <h2 className="font-semibold text-textnormal">System Status</h2>
      </div>
      
      {/* Performance Stats */}
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-textmuted mb-2">Performance</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Scan Rate:</span>
            <span className="text-success font-mono">{systemStatus.scanRate.toFixed(0)} tok/s</span>
          </div>
          <div className="flex justify-between">
            <span>Response Time:</span>
            <span className="font-mono">{systemStatus.responseTime.toFixed(0)} ms</span>
          </div>
          <div className="flex justify-between">
            <span>Websocket Ping:</span>
            <span className="font-mono">{systemStatus.websocketPing.toFixed(0)} ms</span>
          </div>
          <div className="flex justify-between">
            <span>CPU Usage:</span>
            <span className="font-mono">{systemStatus.cpuUsage.toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Memory Usage:</span>
            <span className="font-mono">{systemStatus.memoryUsage.toFixed(0)} MB</span>
          </div>
        </div>
      </div>
      
      {/* API Status */}
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-textmuted mb-2">API Status</h3>
        <div className="space-y-2 text-sm">
          {Object.entries(systemStatus.apiStatuses).map(([key, status]) => (
            <div key={key} className="flex justify-between items-center">
              <span>{status.name}:</span>
              <div className="flex items-center">
                <span 
                  className={`h-2 w-2 rounded-full mr-1 ${
                    status.connected 
                      ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" 
                      : "bg-red-500 shadow-sm shadow-red-500/50"
                  }`}
                ></span>
                <span className="text-xs">
                  {status.requestsPerSecond ? `${status.requestsPerSecond} req/s` : 
                   status.rateLimit ? 'Rate limited' : 
                   status.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Live Activity Log */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col">
        <h3 className="text-sm font-medium text-textmuted mb-2">Activity Log</h3>
        <div 
          ref={logsRef}
          className="flex-1 overflow-y-auto scrollbar-thin font-mono text-xs"
        >
          <div className="space-y-1">
            {activityLogs.map((log, index) => (
              <div key={index} className={getLogClass(log.type)}>
                [{formatTime(log.timestamp)}] {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="p-3 border-t border-gray-800 space-y-2">
        <Button 
          variant="outline"
          className="w-full bg-surface hover:bg-surfacelight text-textnormal border border-gray-700 rounded px-3 py-2 text-sm flex items-center justify-center"
          onClick={onExportLogs}
        >
          <span className="material-icons text-sm mr-1">description</span>
          Export Logs
        </Button>
        <Button 
          variant="outline"
          className="w-full bg-surface hover:bg-surfacelight text-textnormal border border-gray-700 rounded px-3 py-2 text-sm flex items-center justify-center"
          onClick={onReportIssue}
        >
          <span className="material-icons text-sm mr-1">bug_report</span>
          Report Issue
        </Button>
      </div>
      <div className="resize-handle"></div>
    </div>
  );
}
