
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import HomeView from './views/HomeView';
import LoginView from './views/LoginView';
import ManagerMatchList from './views/ManagerMatchList';
import ManagerDashboard from './views/ManagerDashboard';
import GameMaster from './views/GameMaster';
import PlayerView from './views/PlayerView';
import SpectatorView from './views/SpectatorView';

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
