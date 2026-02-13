import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MagnifyingGlass, User, Buildings, ArrowLeft } from "@phosphor-icons/react";
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

const tabs: { label: string; value: SearchType }[] = [
  { label: "Todos", value: "all" },
  { label: "Pessoas", value: "users" },
  { label: "Empresas", value: "companies" },
];

function SearchResultCard({ result, onClick }: { result: SearchResult; onClick: (r: SearchResult) => void }) {
  const badgeType = useUserBadge(result.type === "user" ? result.id : undefined);
  return (
    <Card
      className="cursor-pointer hover:border-muted-foreground/30 transition-all"
      onClick={() => onClick(result)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={(result.type === "user" ? result.avatar_url : result.logo_url) || undefined} />
          <AvatarFallback className="bg-secondary">
            {result.type === "user" ? <User className="w-4 h-4" /> : <Buildings className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate flex items-center gap-1">
            {result.name}
            {result.type === "user" && <PremiumBadge type={badgeType} size={14} />}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {result.type === "user" ? result.job_title || result.bio || "Pessoa" : result.industry || result.description || "Empresa"}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {result.type === "user" ? "Pessoa" : "Empresa"}
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

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "user") {
      // For now, no public user profile page — could navigate to a future one
    } else {
      navigate(`/company/${result.slug}`);
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

        {/* Search input */}
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

        {/* Tabs */}
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

        {/* Results */}
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
    </AppLayout>
  );
}
