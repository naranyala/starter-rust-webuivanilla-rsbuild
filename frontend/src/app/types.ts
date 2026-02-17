// frontend/src/app/types.ts
// Shared types for the application

export interface WindowInfo {
  id: string;
  title: string;
  minimized: boolean;
  active: boolean;
  maximized?: boolean;
  winboxInstance: any;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export interface CardItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  tags: string[];
  action: () => void;
}

export type WindowLifecycleState = 'opened' | 'focused' | 'active' | 'minimized' | 'restored' | 'closed';

export type WsConnectionState =
  | 'initializing'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'bridge_missing'
  | 'error';

export interface WindowLifecyclePayload {
  event: WindowLifecycleState;
  window_id: string;
  title: string;
  timestamp: string;
}

export interface DbStats {
  users: number;
  tables: string[];
}

export interface WsStateHistoryEntry {
  state: WsConnectionState;
  at: string;
  reason?: string;
}

export interface LifecycleLastSent {
  state: WindowLifecycleState;
  ts: number;
}
