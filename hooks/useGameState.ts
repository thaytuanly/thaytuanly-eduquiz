
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.ts';
import { GameState, GameStatus, Question } from '../types.ts';

export const useGameState = (role: 'MANAGER' | 'PLAYER' | 'SPECTATOR', initialCode?: string) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null);

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
        .single();

      if (matchError || !match) return;

      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('match_id', match.id)
        .order('created_at', { ascending: true });

      setMatchId(match.id);
      setQuestionStartedAt(match.question_started_at);
      
      setGameState({
        matchCode: match.code,
        status: match.status as GameStatus,
        currentQuestionIndex: match.current_question_index,
        questions: mapQuestions(match.questions),
        players: (players || []).map(p => ({ ...p, isReady: true })),
        timer: match.timer || 0,
        maxTime: 0,
        activeBuzzerPlayerId: match.active_buzzer_player_id,
        buzzerP1Id: match.buzzer_p1_id,
        buzzerP2Id: match.buzzer_p2_id
      });
    } catch (e) {
      console.error("Supabase request failed:", e);
    }
  }, [initialCode]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (!initialCode || !matchId) return;

    const channel = supabase
      .channel(`global_sync_${matchId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'matches', 
        filter: `id=eq.${matchId}` 
      }, (payload) => {
        // Luôn fetch lại state khi có thay đổi quan trọng để đảm bảo đồng bộ 100%
        fetchState();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'players', 
        filter: `match_id=eq.${matchId}` 
      }, () => {
        fetchState();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'responses', 
        filter: `match_id=eq.${matchId}` 
      }, () => {
        // Thông báo cho các view cần load lại responses
        window.dispatchEvent(new CustomEvent('sync_responses'));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialCode, matchId, fetchState]);

  const broadcastState = useCallback(async (newState: GameState) => {
    if (!matchId) return;
    try {
      await supabase.from('matches').update({
        status: newState.status,
        current_question_index: newState.currentQuestionIndex,
        timer: newState.timer,
        active_buzzer_player_id: newState.activeBuzzerPlayerId,
        buzzer_p1_id: newState.buzzerP1Id,
        buzzer_p2_id: newState.buzzerP2Id
      }).eq('id', matchId);
    } catch (e) {
      console.error("Failed to broadcast state:", e);
    }
  }, [matchId]);

  return { gameState, broadcastState, matchId, refresh: fetchState, questionStartedAt };
};
