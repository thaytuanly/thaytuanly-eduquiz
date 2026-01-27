
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import HomeView from './views/HomeView.tsx';
import LoginView from './views/LoginView.tsx';
import ManagerMatchList from './views/ManagerMatchList.tsx';
import ManagerDashboard from './views/ManagerDashboard.tsx';
import GameMaster from './views/GameMaster.tsx';
import PlayerView from './views/PlayerView.tsx';
import SpectatorView from './views/SpectatorView.tsx';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/manage-list" element={<ManagerMatchList />} />
        <Route path="/manage/:code" element={<ManagerDashboard />} />
        <Route path="/host/:code" element={<GameMaster />} />
        <Route path="/play/:code" element={<PlayerView />} />
        <Route path="/view/:code" element={<SpectatorView />} />
      </Routes>
    </Router>
  );
};

export default App;
