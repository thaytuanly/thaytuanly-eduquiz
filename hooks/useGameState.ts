
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.ts';
import { GameState, GameStatus, Question } from '../types.ts';

export const useGameState = (role: 'MANAGER' | 'PLAYER' | 'SPECTATOR', initialCode?: string) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const isInitialFetched = useRef(false);

  const mapQuestions = (rawQuestions: any[]): Question[] => {
    return (rawQuestions || []).map((q: any) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      options: q.options,
      correctAnswer: q.correct_answer || q.correctAnswer || '',
      points: q.points || 0,
      timeLimit: q.time_limit || q.timeLimit || 30,
      mediaUrl: q.media_url || q.mediaUrl,
      mediaType: q.media_type || q.mediaType || 'none'
    })).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
  };

  const fetchState = useCallback(async () => {
    if (!initialCode) return;

    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select(`*, questions(*)`)
        .eq('code', initialCode)
        .maybeSingle();

      if (matchError || !match) return;

      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('match_id', match.id)
        .order('created_at', { ascending: true });

      setMatchId(match.id);
      setQuestionStartedAt(match.question_started_at);
      
      setGameState(prev => ({
        ...prev,
        matchCode: match.code,
        status: match.status as GameStatus,
        currentQuestionIndex: match.current_question_index,
        questions: mapQuestions(match.questions),
        players: (players || []).map(p => ({ ...p, isReady: true })),
        timer: match.timer || 0,
        maxTime: 0,
        activeBuzzerPlayerId: match.active_buzzer_player_id,
        buzzerP1Id: match.buzzer_p1_id,
        buzzerP2Id: match.buzzer_p2_id,
        isAnswerRevealed: match.is_answer_revealed || false
      }));

      if (match.current_question_index >= 0) {
        const currentQ = match.questions.find((q: any) => q.sort_order === match.current_question_index) || match.questions[match.current_question_index];
        if (currentQ) {
          const { data: resp } = await supabase.from('responses').select('*').eq('question_id', currentQ.id);
          setResponses(resp || []);
        }
      } else {
        setResponses([]);
      }
      isInitialFetched.current = true;
    } catch (e) {
      console.error("Supabase Sync Error:", e);
    }
  }, [initialCode]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`realtime_room_${matchId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'matches', 
        filter: `id=eq.${matchId}` 
      }, (payload) => {
        const updated = payload.new;
        setQuestionStartedAt(updated.question_started_at);
        setGameState(prev => prev ? ({
          ...prev,
          status: updated.status as GameStatus,
          currentQuestionIndex: updated.current_question_index,
          activeBuzzerPlayerId: updated.active_buzzer_player_id,
          buzzerP1Id: updated.buzzer_p1_id,
          buzzerP2Id: updated.buzzer_p2_id,
          isAnswerRevealed: updated.is_answer_revealed
        }) : null);
        
        fetchState();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'players',
        filter: `match_id=eq.${matchId}`
      }, () => fetchState())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'responses',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setResponses(prev => {
            const exists = prev.find(r => r.id === payload.new.id);
            if (exists) return prev.map(r => r.id === payload.new.id ? payload.new : r);
            return [...prev, payload.new];
          });
        } else if (payload.eventType === 'DELETE') {
          fetchState();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchState]);

  return { gameState, matchId, refresh: fetchState, questionStartedAt, responses };
};
