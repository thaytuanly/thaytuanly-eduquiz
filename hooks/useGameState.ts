
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.ts';
import { GameState, GameStatus } from '../types.ts';

export const useGameState = (role: 'MANAGER' | 'PLAYER' | 'SPECTATOR', initialCode?: string) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

  const isConfigured = !!supabase;

  // 1. Tải dữ liệu ban đầu
  const fetchState = useCallback(async () => {
    if (!initialCode) return;

    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select(`*, questions(*)`)
        .eq('code', initialCode)
        .single();

      if (matchError || !match) {
        console.error("Error fetching match:", matchError);
        return;
      }

      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('match_id', match.id)
        .order('created_at', { ascending: true });

      setMatchId(match.id);
      
      setGameState({
        matchCode: match.code,
        status: match.status as GameStatus,
        currentQuestionIndex: match.current_question_index,
        questions: (match.questions || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)),
        players: players || [],
        timer: match.timer || 0,
        maxTime: 0,
        activeBuzzerPlayerId: match.active_buzzer_player_id
      });
    } catch (e) {
      console.error("Supabase request failed:", e);
    }
  }, [initialCode]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // 2. Lắng nghe Realtime
  useEffect(() => {
    if (!initialCode || !matchId) return;

    const matchChannel = supabase
      .channel(`match:${initialCode}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'matches', 
        filter: `id=eq.${matchId}` 
      }, (payload) => {
        setGameState(prev => prev ? {
          ...prev,
          status: payload.new.status,
          currentQuestionIndex: payload.new.current_question_index,
          timer: payload.new.timer,
          activeBuzzerPlayerId: payload.new.active_buzzer_player_id
        } : null);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'players', 
        filter: `match_id=eq.${matchId}` 
      }, async () => {
        const { data } = await supabase.from('players').select('*').eq('match_id', matchId).order('created_at', { ascending: true });
        setGameState(prev => prev ? { ...prev, players: data || [] } : null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [initialCode, matchId]);

  // 3. Hàm cập nhật trạng thái (Dành cho Manager)
  const broadcastState = useCallback(async (newState: GameState) => {
    if (!matchId) return;

    try {
      await supabase.from('matches').update({
        status: newState.status,
        current_question_index: newState.currentQuestionIndex,
        timer: newState.timer,
        active_buzzer_player_id: newState.activeBuzzerPlayerId
      }).eq('id', matchId);

      setGameState(newState);
    } catch (e) {
      console.error("Failed to broadcast state:", e);
    }
  }, [matchId]);

  return { gameState, broadcastState, matchId };
};
