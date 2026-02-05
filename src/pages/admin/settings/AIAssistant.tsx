 import { useState, useEffect } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { Robot } from '@phosphor-icons/react';
 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
 import { Label } from '@/components/ui/label';
 import { Switch } from '@/components/ui/switch';
 import { Slider } from '@/components/ui/slider';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from '@/components/ui/card';
 import {
   Tabs,
   TabsContent,
   TabsList,
   TabsTrigger,
 } from '@/components/ui/tabs';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 interface AIAssistantConfig {
   id: string;
   system_prompt: string;
   system_instruction: string;
   knowledge_base: {
     models: Array<{
       name: string;
       company: string;
       type: string;
       pricing: string;
       context_window: string;
       best_for: string[];
       limitations: string[];
       updated_at: string;
     }>;
     categories: Record<string, string[]>;
     comparisons: Array<{
       models: string[];
       summary: string;
     }>;
     faqs: Array<{
       question: string;
       answer: string;
     }>;
   };
   model: string;
   temperature: number;
   max_tokens: number;
   is_active: boolean;
 }
 
 const AVAILABLE_MODELS = [
   { value: 'openai/gpt-5', label: 'GPT-5 (OpenAI)' },
   { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (OpenAI)' },
   { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano (OpenAI)' },
   { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Google)' },
   { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Google)' },
   { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Google)' },
 ];
 
 export default function AIAssistant() {
   const queryClient = useQueryClient();
   const [config, setConfig] = useState<AIAssistantConfig | null>(null);
   const [knowledgeBaseJson, setKnowledgeBaseJson] = useState('');
   const [jsonError, setJsonError] = useState<string | null>(null);
 
   const { data, isLoading } = useQuery({
     queryKey: ['ai-assistant-config'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('ai_assistant_config')
         .select('*')
         .limit(1)
         .single();
 
       if (error) throw error;
       return data as unknown as AIAssistantConfig;
     },
   });
 
   useEffect(() => {
     if (data) {
       setConfig(data);
       setKnowledgeBaseJson(JSON.stringify(data.knowledge_base, null, 2));
     }
   }, [data]);
 
   const updateMutation = useMutation({
     mutationFn: async (updates: Partial<AIAssistantConfig>) => {
       if (!config?.id) throw new Error('Config not loaded');
       
       const { error } = await supabase
         .from('ai_assistant_config')
         .update(updates)
         .eq('id', config.id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['ai-assistant-config'] });
       toast.success('Configurações salvas com sucesso!');
     },
     onError: (error) => {
       toast.error('Erro ao salvar: ' + error.message);
     },
   });
 
   const handleSavePrompts = () => {
     if (!config) return;
     updateMutation.mutate({
       system_prompt: config.system_prompt,
       system_instruction: config.system_instruction,
     });
   };
 
   const handleSaveKnowledgeBase = () => {
     try {
       const parsed = JSON.parse(knowledgeBaseJson);
       setJsonError(null);
       updateMutation.mutate({ knowledge_base: parsed });
     } catch (e) {
       setJsonError('JSON inválido. Verifique a sintaxe.');
     }
   };
 
   const handleSaveSettings = () => {
     if (!config) return;
     updateMutation.mutate({
       model: config.model,
       temperature: config.temperature,
       max_tokens: config.max_tokens,
       is_active: config.is_active,
     });
   };
 
   if (isLoading || !config) {
     return (
       <AdminLayout>
         <div className="flex items-center justify-center h-64">
           <div className="animate-pulse text-muted-foreground">Carregando...</div>
         </div>
       </AdminLayout>
     );
   }
 
   return (
     <AdminLayout>
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-bold flex items-center gap-2">
               <Robot className="w-6 h-6" />
               Assistente IA
             </h1>
             <p className="text-muted-foreground">
               Configure o assistente de IA para os assinantes
             </p>
           </div>
           <div className="flex items-center gap-3">
             <Label htmlFor="is-active" className="text-sm">
               {config.is_active ? 'Ativo' : 'Inativo'}
             </Label>
             <Switch
               id="is-active"
               checked={config.is_active}
               onCheckedChange={(checked) => {
                 setConfig({ ...config, is_active: checked });
                 updateMutation.mutate({ is_active: checked });
               }}
             />
           </div>
         </div>
 
         <Tabs defaultValue="prompts" className="space-y-4">
           <TabsList>
             <TabsTrigger value="prompts">Prompts</TabsTrigger>
             <TabsTrigger value="knowledge">Base de Conhecimento</TabsTrigger>
             <TabsTrigger value="settings">Configurações</TabsTrigger>
           </TabsList>
 
           <TabsContent value="prompts" className="space-y-4">
             <Card>
               <CardHeader>
                 <CardTitle>System Prompt</CardTitle>
                 <CardDescription>
                   Define a personalidade e comportamento geral do assistente
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <Textarea
                   value={config.system_prompt}
                   onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                   rows={10}
                   className="font-mono text-sm"
                   placeholder="Você é um assistente especializado em..."
                 />
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader>
                 <CardTitle>Instruções Adicionais</CardTitle>
                 <CardDescription>
                   Instruções específicas sobre como usar a base de conhecimento
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <Textarea
                   value={config.system_instruction || ''}
                   onChange={(e) => setConfig({ ...config, system_instruction: e.target.value })}
                   rows={4}
                   className="font-mono text-sm"
                   placeholder="Use a base de conhecimento para..."
                 />
               </CardContent>
             </Card>
 
             <Button 
               onClick={handleSavePrompts} 
               disabled={updateMutation.isPending}
             >
               {updateMutation.isPending ? 'Salvando...' : 'Salvar Prompts'}
             </Button>
           </TabsContent>
 
           <TabsContent value="knowledge" className="space-y-4">
             <Card>
               <CardHeader>
                 <CardTitle>Base de Conhecimento (JSON)</CardTitle>
                 <CardDescription>
                   Adicione informações sobre modelos de IA, categorias, comparações e FAQs
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                   <p className="font-semibold mb-2">Estrutura esperada:</p>
                   <pre className="overflow-x-auto">
 {`{
   "models": [{ "name", "company", "type", "pricing", "context_window", "best_for", "limitations" }],
   "categories": { "code": ["Model1", "Model2"], "images": [...] },
   "comparisons": [{ "models": ["A", "B"], "summary": "..." }],
   "faqs": [{ "question": "...", "answer": "..." }]
 }`}
                   </pre>
                 </div>
                 <Textarea
                   value={knowledgeBaseJson}
                   onChange={(e) => {
                     setKnowledgeBaseJson(e.target.value);
                     setJsonError(null);
                   }}
                   rows={20}
                   className="font-mono text-xs"
                   placeholder="{}"
                 />
                 {jsonError && (
                   <p className="text-sm text-destructive">{jsonError}</p>
                 )}
               </CardContent>
             </Card>
 
             <Button 
               onClick={handleSaveKnowledgeBase} 
               disabled={updateMutation.isPending}
             >
               {updateMutation.isPending ? 'Salvando...' : 'Salvar Base de Conhecimento'}
             </Button>
           </TabsContent>
 
           <TabsContent value="settings" className="space-y-4">
             <Card>
               <CardHeader>
                 <CardTitle>Modelo de IA</CardTitle>
                 <CardDescription>
                   Selecione qual modelo será usado pelo assistente
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <Select
                   value={config.model}
                   onValueChange={(value) => setConfig({ ...config, model: value })}
                 >
                   <SelectTrigger className="w-full max-w-md">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {AVAILABLE_MODELS.map((model) => (
                       <SelectItem key={model.value} value={model.value}>
                         {model.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader>
                 <CardTitle>Temperatura</CardTitle>
                 <CardDescription>
                   Controla a criatividade das respostas (0 = mais preciso, 1 = mais criativo)
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex items-center gap-4 max-w-md">
                   <Slider
                     value={[config.temperature]}
                     onValueChange={([value]) => setConfig({ ...config, temperature: value })}
                     min={0}
                     max={1}
                     step={0.1}
                     className="flex-1"
                   />
                   <span className="text-sm font-mono w-12 text-right">
                     {config.temperature.toFixed(1)}
                   </span>
                 </div>
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader>
                 <CardTitle>Máximo de Tokens</CardTitle>
                 <CardDescription>
                   Limite de tokens por resposta (100-8192)
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <Input
                   type="number"
                   value={config.max_tokens}
                   onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 2048 })}
                   min={100}
                   max={8192}
                   className="max-w-[200px]"
                 />
               </CardContent>
             </Card>
 
             <Button 
               onClick={handleSaveSettings} 
               disabled={updateMutation.isPending}
             >
               {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
             </Button>
           </TabsContent>
         </Tabs>
       </div>
     </AdminLayout>
   );
 }