import type { 
  Token, ArbitrageOpportunityData, ApiStatus, 
  SystemStatus, ActivityLogEntry, ArbitrageSettings, 
  TokenSnipeSettings, WalletTrackingSettings, AutoTradingSettings,
  SolanaNetworkStatus
} from "@shared/schema";

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface ConnectionStatusProps {
  name: string;
  connected: boolean;
  tooltip?: string;
  requestsPerSecond?: number;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

export interface ModuleConfig {
  id: string;
  name: string;
  icon: string;
  settings: React.ReactNode;
  mainContent: React.ReactNode;
}

export interface DexInfo {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface ArbitrageOpportunityProps {
  opportunity: ArbitrageOpportunityData;
  onExecute: (id: number) => void;
}

export interface StatusPanelProps {
  systemStatus: SystemStatus;
  activityLogs: ActivityLogEntry[];
  onExportLogs: () => void;
  onReportIssue: () => void;
}

export interface ControlPanelProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  arbitrageSettings: ArbitrageSettings;
  tokenSnipeSettings: TokenSnipeSettings;
  walletTrackingSettings: WalletTrackingSettings;
  autoTradingSettings: AutoTradingSettings;
  onStartScanning: () => void;
  onResetSettings: () => void;
  onSettingsChange: <T>(moduleId: string, settings: Partial<T>) => void;
}

export interface TokenSniperListProps {
  tokens: Token[];
  onSnipe: (token: Token) => void;
}

export interface CopyTradingListProps {
  wallets: {
    address: string;
    alias?: string;
    active: boolean;
  }[];
  onToggleTracking: (address: string, active: boolean) => void;
}

export interface AutoTradingConfigProps {
  settings: AutoTradingSettings;
  onSettingsChange: (settings: Partial<AutoTradingSettings>) => void;
  onStartAutoTrading: () => void;
}

export interface ArbitrageTableProps {
  opportunities: ArbitrageOpportunityData[];
  isLoading: boolean;
  onExecute: (id: number) => void;
  onSort: (field: string) => void;
  onFilterChange: (filters: Record<string, any>) => void;
  onSearch: (query: string) => void;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface Filter {
  minSpread?: number;
  dexes?: string[];
  minLiquidity?: number;
}

export interface WebSocketHookReturn {
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  send: (data: any) => void;
  error: Error | null;
}
