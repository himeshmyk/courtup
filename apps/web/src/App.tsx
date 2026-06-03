import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Explore from './pages/Explore';
import VenueDetail from './pages/VenueDetail';
import SlotGrid from './pages/SlotGrid';
import BookingConfirm from './pages/BookingConfirm';
import MyBookings from './pages/MyBookings';
import GameDetail from './pages/GameDetail';
import HostGame from './pages/HostGame';
import Profile from './pages/Profile';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/venue/:id" element={<VenueDetail />} />
        <Route path="/book/:facilityId" element={<SlotGrid />} />
        <Route path="/confirm" element={<BookingConfirm />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/game/:id" element={<GameDetail />} />
        <Route path="/host" element={<HostGame />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}
