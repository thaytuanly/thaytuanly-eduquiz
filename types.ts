
export enum QuestionType {
  MCQ = 'MCQ',
  SHORT_ANSWER = 'SHORT_ANSWER',
  BUZZER = 'BUZZER'
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  mediaUrl?: string; // Google Drive or YouTube
  mediaType?: 'image' | 'video' | 'none';
  options?: string[]; // For MCQ: [A, B, C, D]
  correctAnswer: string;
  points: number;
  timeLimit: number; // Seconds for this specific question
}

export interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswer?: string;
  responseTime?: number; // ms
  buzzerTime?: number; // timestamp
  isReady: boolean;
}

export enum GameStatus {
  LOBBY = 'LOBBY',
  QUESTION_ACTIVE = 'QUESTION_ACTIVE',
  SHOWING_RESULTS = 'SHOWING_RESULTS',
  FINISHED = 'FINISHED'
}

export interface GameState {
  matchCode: string;
  status: GameStatus;
  currentQuestionIndex: number;
  questions: Question[];
  players: Player[];
  timer: number;
  maxTime: number;
  activeBuzzerPlayerId: string | null;
}

export interface BroadcastMessage {
  type: 'UPDATE_STATE' | 'SYNC_REQUEST' | 'PLAYER_JOIN' | 'BUZZ' | 'ANSWER_SUBMIT';
  payload: any;
}
