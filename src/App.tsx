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
import Highlights from "./pages/Highlights";
import Spaces from "./pages/Spaces";
import SpaceDetail from "./pages/SpaceDetail";
import PostDetail from "./pages/PostDetail";
import Channels from "./pages/Channels";
import ChannelDetail from "./pages/ChannelDetail";
import ChannelPostDetail from "./pages/ChannelPostDetail";
import CreateChannelPost from "./pages/CreateChannelPost";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import PersonalData from "./pages/profile/PersonalData";
import NotFound from "./pages/NotFound";
import SetupAdmin from "./pages/SetupAdmin";
import { SubscriptionGuard } from "./components/SubscriptionGuard";

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
          <Route path="/setup-admin" element={<SetupAdmin />} />

          {/* Protected Routes - Require active subscription */}
          <Route path="/home" element={<SubscriptionGuard><Home /></SubscriptionGuard>} />
          <Route path="/highlights" element={<SubscriptionGuard><Highlights /></SubscriptionGuard>} />
          <Route path="/spaces" element={<SubscriptionGuard><Spaces /></SubscriptionGuard>} />
          <Route path="/spaces/:spaceId" element={<SubscriptionGuard><SpaceDetail /></SubscriptionGuard>} />
          <Route path="/spaces/:spaceId/post/:postId" element={<SubscriptionGuard><PostDetail /></SubscriptionGuard>} />
          <Route path="/channels" element={<SubscriptionGuard><Channels /></SubscriptionGuard>} />
          <Route path="/channels/:channelId" element={<SubscriptionGuard><ChannelDetail /></SubscriptionGuard>} />
          <Route path="/channels/:channelId/new-post" element={<SubscriptionGuard><CreateChannelPost /></SubscriptionGuard>} />
          <Route path="/channels/:channelId/post/:postId" element={<SubscriptionGuard><ChannelPostDetail /></SubscriptionGuard>} />
          <Route path="/notifications" element={<SubscriptionGuard><Notifications /></SubscriptionGuard>} />
          <Route path="/profile" element={<SubscriptionGuard><Profile /></SubscriptionGuard>} />
          <Route path="/profile/personal" element={<SubscriptionGuard><PersonalData /></SubscriptionGuard>} />

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
