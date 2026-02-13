import { useState } from "react";
import { motion } from "framer-motion";
import { MagnifyingGlass, User, Buildings, ArrowLeft } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useSearch, SearchType, SearchResult } from "@/hooks/useSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { useUserBadge } from "@/hooks/useUserBadge";
import { PremiumBadge } from "@/components/PremiumBadge";
import { AuthorModal } from "@/components/post/AuthorModal";
import { supabase } from "@/integrations/supabase/client";

const tabs: { label: string; value: SearchType }[] = [
  { label: "Todos", value: "all" },
  { label: "Pessoas", value: "users" },
  { label: "Empresas", value: "companies" },
];

interface AuthorData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  education: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
}

function SearchResultCard({
  result,
  onClick,
}: {
  result: SearchResult;
  onClick: (r: SearchResult) => void;
}) {
  const badgeUserId =
    result.type === "user" ? result.id : result.owner_id;
  const badgeType = useUserBadge(badgeUserId);

  const isEmpresa =
    result.type === "company" ||
    (result.type === "user" && result.account_type === "empresa");

  return (
    <Card
      className="cursor-pointer hover:border-muted-foreground/30 transition-all"
      onClick={() => onClick(result)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={
              (result.type === "user" ? result.avatar_url : result.logo_url) ||
              undefined
            }
          />
          <AvatarFallback className="bg-secondary">
            {isEmpresa ? (
              <Buildings className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate flex items-center gap-1">
            {result.name}
            <PremiumBadge type={badgeType} size={14} />
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {result.type === "user"
              ? result.job_title || result.bio || "Pessoa"
              : result.industry || result.description || "Empresa"}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {isEmpresa ? "Empresa" : "Pessoa"}
        </Badge>
      </CardContent>
    </Card>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchType>("all");
  const debouncedQuery = useDebounce(query, 300);
  const { data: results = [], isLoading } = useSearch(debouncedQuery, activeTab);

  const [selectedAuthor, setSelectedAuthor] = useState<AuthorData | null>(null);
  const [showAuthorModal, setShowAuthorModal] = useState(false);

  const handleResultClick = async (result: SearchResult) => {
    if (result.type === "user") {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, education, instagram_url, linkedin_url")
        .eq("id", result.id)
        .maybeSingle();

      if (data) {
        setSelectedAuthor(data);
        setShowAuthorModal(true);
      }
    } else {
      setSelectedAuthor({
        id: result.id,
        full_name: result.name,
        avatar_url: result.logo_url,
        bio: result.description,
        education: result.industry,
        instagram_url: null,
        linkedin_url: null,
      });
      setShowAuthorModal(true);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Buscar</h1>
        </motion.div>

        <div className="relative mb-4">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pessoas ou empresas..."
            className="pl-10"
            autoFocus
          />
        </div>

        <div className="flex gap-2 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {debouncedQuery.length < 2 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Digite pelo menos 2 caracteres para buscar
          </p>
        ) : isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Nenhum resultado encontrado
          </p>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {results.map((result) => (
              <SearchResultCard key={`${result.type}-${result.id}`} result={result} onClick={handleResultClick} />
            ))}
          </motion.div>
        )}
      </div>

      <AuthorModal
        author={selectedAuthor}
        isOpen={showAuthorModal}
        onClose={() => setShowAuthorModal(false)}
      />
    </AppLayout>
  );
}
