import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ConnectionStatusProps } from '@/types';

export function ConnectionStatus({ name, connected, tooltip, requestsPerSecond }: ConnectionStatusProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center tooltip">
            <span 
              className={cn(
                "h-2 w-2 rounded-full mr-1",
                connected 
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" 
                  : "bg-red-500 shadow-sm shadow-red-500/50"
              )}
            />
            <span className="text-xs hidden md:inline text-gray-300">{name}</span>
            {requestsPerSecond && (
              <span className="ml-1 text-xs text-gray-400">{requestsPerSecond} req/s</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {name}: {connected ? 'Connected' : 'Disconnected'}
            {tooltip && <span> - {tooltip}</span>}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
