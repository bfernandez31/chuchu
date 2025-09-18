import {Direction} from "./direction";

export type DataMsg = {
  type: 'joined',
  name: string,
  key: string,
  bot?: boolean
} | {
  type: 'queue',
  key: string
} | {
  type: 'quit',
  key: string
} | {
  type: 'server'
} | {
  type: 'input',
  x: number,
  y: number,
  key: string
}| {
  type: 'arrow',
  direction: Direction,
  key: string
} | {
  type: 'predictive-input',
  playerId: string,
  input: any,
  prediction: any
} | {
  type: 'performance-report',
  playerId: string,
  metrics: any
} | {
  type: 'request-state-sync',
  playerId: string,
  lastSequence: number
};
