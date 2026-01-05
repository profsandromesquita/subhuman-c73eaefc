import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const channels = [
  {
    id: "geral",
    name: "Geral",
    description: "Discussões abertas sobre IA",
    members: 1234,
    posts: 89,
    lastActivity: "há 5 min",
  },
  {
    id: "duvidas",
    name: "Dúvidas",
    description: "Tire suas dúvidas com a comunidade",
    members: 987,
    posts: 156,
    lastActivity: "há 12 min",
  },
  {
    id: "projetos",
    name: "Projetos",
    description: "Compartilhe e discuta seus projetos",
    members: 654,
    posts: 45,
    lastActivity: "há 1h",
  },
  {
    id: "ferramentas",
    name: "Ferramentas",
    description: "Recomendações de ferramentas de IA",
    members: 876,
    posts: 234,
    lastActivity: "há 30 min",
  },
];

export default function Channels() {
  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold mb-1">Canais</h1>
            <p className="text-muted-foreground text-sm">
              Participe das discussões
            </p>
          </div>
          <Button size="icon" variant="secondary">
            <Plus className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Channels List */}
        <div className="space-y-3">
          {channels.map((channel, index) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/channels/${channel.id}`}>
                <Card className="hover:border-muted-foreground/30 transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="p-2 rounded-lg bg-secondary">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <h3 className="font-semibold">{channel.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {channel.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {channel.members}
                          </span>
                          <span>{channel.posts} posts</span>
                          <span>Ativo {channel.lastActivity}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground mt-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
