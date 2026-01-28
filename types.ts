
export enum QuestionType {
  MCQ = 'MCQ',
  SHORT_ANSWER = 'SHORT_ANSWER',
  BUZZER = 'BUZZER'
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'none';
  options?: string[];
  correctAnswer: string;
  points: number;
  timeLimit: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswer?: string;
  responseTime?: number;
  buzzerTime?: number;
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
  buzzerP1Id: string | null;
  buzzerP2Id: string | null;
  isAnswerRevealed: boolean;
}

export interface BroadcastMessage {
  type: 'UPDATE_STATE' | 'SYNC_REQUEST' | 'PLAYER_JOIN' | 'BUZZ' | 'ANSWER_SUBMIT';
  payload: any;
}
