import { createContext, useContext, useEffect, useState } from 'react';

const TeamContext = createContext(null);

const STORAGE_KEY = 'ai_challenge_team';

export function TeamProvider({ children }) {
  const [team, setTeamState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (team) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [team]);

  function setTeam(newTeam) {
    setTeamState(newTeam);
  }

  function leaveTeam() {
    setTeamState(null);
  }

  return (
    <TeamContext.Provider value={{ team, setTeam, leaveTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam must be used within TeamProvider');
  return ctx;
}
