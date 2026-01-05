import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Plans from "./pages/Plans";
import Home from "./pages/Home";
import Spaces from "./pages/Spaces";
import SpaceDetail from "./pages/SpaceDetail";
import Channels from "./pages/Channels";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Subscriptions from "./pages/admin/Subscriptions";
import AdminSpaces from "./pages/admin/Spaces";
import SpaceContent from "./pages/admin/SpaceContent";
import AdminChannels from "./pages/admin/Channels";
import Moderation from "./pages/admin/Moderation";
import GeneralSettings from "./pages/admin/settings/General";
import SystemUsers from "./pages/admin/settings/SystemUsers";
import NotificationSettings from "./pages/admin/settings/Notifications";
import PaymentSettings from "./pages/admin/settings/Payments";
import { AdminGuard } from "./components/admin/AdminGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/home" element={<Home />} />
          <Route path="/spaces" element={<Spaces />} />
          <Route path="/spaces/:spaceId" element={<SpaceDetail />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><Users /></AdminGuard>} />
          <Route path="/admin/subscriptions" element={<AdminGuard><Subscriptions /></AdminGuard>} />
          <Route path="/admin/spaces" element={<AdminGuard><AdminSpaces /></AdminGuard>} />
          <Route path="/admin/content" element={<AdminGuard><SpaceContent /></AdminGuard>} />
          <Route path="/admin/channels" element={<AdminGuard><AdminChannels /></AdminGuard>} />
          <Route path="/admin/moderation" element={<AdminGuard><Moderation /></AdminGuard>} />
          <Route path="/admin/settings/general" element={<AdminGuard><GeneralSettings /></AdminGuard>} />
          <Route path="/admin/settings/users" element={<AdminGuard requireAdmin><SystemUsers /></AdminGuard>} />
          <Route path="/admin/settings/notifications" element={<AdminGuard><NotificationSettings /></AdminGuard>} />
          <Route path="/admin/settings/payments" element={<AdminGuard requireAdmin><PaymentSettings /></AdminGuard>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
