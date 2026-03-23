import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingFallback } from "@/components/LoadingFallback";
import { useTheme } from "@/hooks/useTheme";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import { AdminGuard } from "./components/admin/AdminGuard";

// Landing is loaded synchronously (entry point for Meta campaigns - must render instantly)
import Landing from "./pages/Landing";
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Plans = lazy(() => import("./pages/Plans"));
const SetupAdmin = lazy(() => import("./pages/SetupAdmin"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Contact = lazy(() => import("./pages/Contact"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));

// Protected pages
const Home = lazy(() => import("./pages/Home"));
const Highlights = lazy(() => import("./pages/Highlights"));
const Spaces = lazy(() => import("./pages/Spaces"));
const SpaceDetail = lazy(() => import("./pages/SpaceDetail"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Podcasts = lazy(() => import("./pages/Podcasts"));
const PodcastDetail = lazy(() => import("./pages/PodcastDetail"));
const Channels = lazy(() => import("./pages/Channels"));
const ChannelDetail = lazy(() => import("./pages/ChannelDetail"));
const ChannelPostDetail = lazy(() => import("./pages/ChannelPostDetail"));
const CreateChannelPost = lazy(() => import("./pages/CreateChannelPost"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const PersonalData = lazy(() => import("./pages/profile/PersonalData"));
const Security = lazy(() => import("./pages/profile/Security"));
const NotificationPreferences = lazy(() => import("./pages/profile/NotificationPreferences"));
const Settings = lazy(() => import("./pages/profile/Settings"));
const SavedContent = lazy(() => import("./pages/profile/SavedContent"));
const CompanyForm = lazy(() => import("./pages/profile/CompanyForm"));
const CompanyMembers = lazy(() => import("./pages/profile/CompanyMembers"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const Search = lazy(() => import("./pages/Search"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Messages = lazy(() => import("./pages/Messages"));
const ConversationDetail = lazy(() => import("./pages/ConversationDetail"));

// Admin pages
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Users = lazy(() => import("./pages/admin/Users"));
const Subscriptions = lazy(() => import("./pages/admin/Subscriptions"));
const AdminSpaces = lazy(() => import("./pages/admin/Spaces"));
const SpaceContent = lazy(() => import("./pages/admin/SpaceContent"));
const AdminPodcasts = lazy(() => import("./pages/admin/Podcasts"));
const AdminChannels = lazy(() => import("./pages/admin/Channels"));
const AdminCoupons = lazy(() => import("./pages/admin/Coupons"));
const Moderation = lazy(() => import("./pages/admin/Moderation"));
const GeneralSettings = lazy(() => import("./pages/admin/settings/General"));
const SystemUsers = lazy(() => import("./pages/admin/settings/SystemUsers"));
const NotificationSettings = lazy(() => import("./pages/admin/settings/Notifications"));
const PaymentSettings = lazy(() => import("./pages/admin/settings/Payments"));
const AIAssistantSettings = lazy(() => import("./pages/admin/settings/AIAssistant"));
const RAGDocuments = lazy(() => import("./pages/admin/rag/Documents"));
const RAGChunks = lazy(() => import("./pages/admin/rag/Chunks"));
const RAGTest = lazy(() => import("./pages/admin/rag/Test"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const ContentIntelligence = lazy(() => import("./pages/admin/ContentIntelligence"));

function ThemeInitializer() {
  useTheme();
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <TooltipProvider>
        <Sonner position="top-center" />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/setup-admin" element={<SetupAdmin />} />
              <Route path="/privacidade" element={<PrivacyPolicy />} />
              <Route path="/contato" element={<Contact />} />
              <Route path="/termos" element={<TermsOfUse />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />

              {/* Protected Routes - Require active subscription */}
              <Route path="/home" element={<SubscriptionGuard><Home /></SubscriptionGuard>} />
              <Route path="/highlights" element={<SubscriptionGuard><Highlights /></SubscriptionGuard>} />
              <Route path="/spaces" element={<SubscriptionGuard><Spaces /></SubscriptionGuard>} />
              <Route path="/spaces/:spaceSlug" element={<SubscriptionGuard><SpaceDetail /></SubscriptionGuard>} />
              <Route path="/spaces/:spaceSlug/post/:postSlug" element={<SubscriptionGuard><PostDetail /></SubscriptionGuard>} />
              <Route path="/podcasts" element={<SubscriptionGuard><Podcasts /></SubscriptionGuard>} />
              <Route path="/podcasts/:podcastSlug" element={<SubscriptionGuard><PodcastDetail /></SubscriptionGuard>} />
              <Route path="/channels" element={<SubscriptionGuard><Channels /></SubscriptionGuard>} />
              <Route path="/channels/:channelId" element={<SubscriptionGuard><ChannelDetail /></SubscriptionGuard>} />
              <Route path="/channels/:channelId/new-post" element={<SubscriptionGuard><CreateChannelPost /></SubscriptionGuard>} />
              <Route path="/channels/:channelId/edit/:postId" element={<SubscriptionGuard><CreateChannelPost /></SubscriptionGuard>} />
              <Route path="/channels/:channelId/post/:postId" element={<SubscriptionGuard><ChannelPostDetail /></SubscriptionGuard>} />
              <Route path="/notifications" element={<SubscriptionGuard><Notifications /></SubscriptionGuard>} />
              <Route path="/profile" element={<SubscriptionGuard><Profile /></SubscriptionGuard>} />
              <Route path="/profile/personal" element={<SubscriptionGuard><PersonalData /></SubscriptionGuard>} />
              <Route path="/profile/security" element={<SubscriptionGuard><Security /></SubscriptionGuard>} />
              <Route path="/profile/notifications" element={<SubscriptionGuard><NotificationPreferences /></SubscriptionGuard>} />
              <Route path="/profile/settings" element={<SubscriptionGuard><Settings /></SubscriptionGuard>} />
              <Route path="/profile/saved" element={<SubscriptionGuard><SavedContent /></SubscriptionGuard>} />
              <Route path="/profile/company" element={<SubscriptionGuard><CompanyForm /></SubscriptionGuard>} />
              <Route path="/profile/company/members" element={<SubscriptionGuard><CompanyMembers /></SubscriptionGuard>} />
              <Route path="/company/:slug" element={<SubscriptionGuard><CompanyProfile /></SubscriptionGuard>} />
              <Route path="/search" element={<SubscriptionGuard><Search /></SubscriptionGuard>} />
              <Route path="/ai-assistant" element={<SubscriptionGuard><AIAssistant /></SubscriptionGuard>} />
              <Route path="/events" element={<SubscriptionGuard><Events /></SubscriptionGuard>} />
              <Route path="/events/:eventSlug" element={<SubscriptionGuard><EventDetail /></SubscriptionGuard>} />
              <Route path="/messages" element={<SubscriptionGuard><Messages /></SubscriptionGuard>} />
              <Route path="/messages/:recipientId" element={<SubscriptionGuard><ConversationDetail /></SubscriptionGuard>} />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
              <Route path="/admin/users" element={<AdminGuard><Users /></AdminGuard>} />
              <Route path="/admin/subscriptions" element={<AdminGuard><Subscriptions /></AdminGuard>} />
              <Route path="/admin/coupons" element={<AdminGuard><AdminCoupons /></AdminGuard>} />
              <Route path="/admin/spaces" element={<AdminGuard><AdminSpaces /></AdminGuard>} />
              <Route path="/admin/content" element={<AdminGuard><SpaceContent /></AdminGuard>} />
              <Route path="/admin/podcasts" element={<AdminGuard><AdminPodcasts /></AdminGuard>} />
              <Route path="/admin/channels" element={<AdminGuard><AdminChannels /></AdminGuard>} />
              <Route path="/admin/moderation" element={<AdminGuard><Moderation /></AdminGuard>} />
              <Route path="/admin/events" element={<AdminGuard><AdminEvents /></AdminGuard>} />
              <Route path="/admin/intelligence" element={<AdminGuard><ContentIntelligence /></AdminGuard>} />
              <Route path="/admin/settings/general" element={<AdminGuard><GeneralSettings /></AdminGuard>} />
              <Route path="/admin/settings/users" element={<AdminGuard requireAdmin><SystemUsers /></AdminGuard>} />
              <Route path="/admin/settings/notifications" element={<AdminGuard><NotificationSettings /></AdminGuard>} />
              <Route path="/admin/settings/payments" element={<AdminGuard requireAdmin><PaymentSettings /></AdminGuard>} />
              <Route path="/admin/settings/ai-assistant" element={<AdminGuard requireAdmin><AIAssistantSettings /></AdminGuard>} />
              <Route path="/admin/rag/documents" element={<AdminGuard><RAGDocuments /></AdminGuard>} />
              <Route path="/admin/rag/chunks" element={<AdminGuard><RAGChunks /></AdminGuard>} />
              <Route path="/admin/rag/test" element={<AdminGuard><RAGTest /></AdminGuard>} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
