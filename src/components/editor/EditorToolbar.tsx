import { Editor } from "@tiptap/react";
import { 
  TextB, 
  TextItalic, 
  TextUnderline, 
  Link as LinkIcon,
  ListBullets,
  ListNumbers,
  Quotes,
  Code,
  Palette,
  HighlighterCircle,
  Image as ImageIcon
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaUpload } from "@/hooks/useMediaUpload";

interface EditorToolbarProps {
  editor: Editor | null;
}

const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Black", value: "#000000" },
  { name: "Gray", value: "#9ca3af" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", value: "" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" },
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const { uploadFile, uploading } = useMediaUpload();

  const setLink = useCallback(() => {
    if (!editor) return;
    
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkUrl("");
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const insertImageFromUrl = useCallback(() => {
    if (!editor || !imageUrl) return;
    const url = imageUrl.startsWith("http") ? imageUrl : `https://${imageUrl}`;
    editor.chain().focus().setImage({ src: url }).run();
    setImageUrl("");
    setShowImageDialog(false);
  }, [editor, imageUrl]);

  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || !editor) return;
    const file = files[0];
    const media = await uploadFile(file);
    if (media) {
      editor.chain().focus().setImage({ src: media.url }).run();
      setShowImageDialog(false);
    }
  }, [editor, uploadFile]);

  if (!editor) return null;

  return (
    <div className="editor-toolbar">
      {/* Text Formatting */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("bold") ? "bg-secondary" : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <TextB className="w-4 h-4" weight={editor.isActive("bold") ? "bold" : "regular"} />
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("italic") ? "bg-secondary" : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <TextItalic className="w-4 h-4" weight={editor.isActive("italic") ? "bold" : "regular"} />
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("underline") ? "bg-secondary" : ""}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <TextUnderline className="w-4 h-4" weight={editor.isActive("underline") ? "bold" : "regular"} />
      </Button>

      <div className="editor-toolbar-separator" />

      {/* Text Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 relative">
            <Palette className="w-4 h-4" />
            <span 
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full"
              style={{ 
                backgroundColor: editor.getAttributes("textStyle").color || "currentColor" 
              }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-5 gap-1">
            {TEXT_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value || "currentColor" }}
                onClick={() => {
                  if (color.value) {
                    editor.chain().focus().setColor(color.value).run();
                  } else {
                    editor.chain().focus().unsetColor().run();
                  }
                }}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlight */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 ${editor.isActive("highlight") ? "bg-secondary" : ""}`}
          >
            <HighlighterCircle className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value || "transparent" }}
                onClick={() => {
                  if (color.value) {
                    editor.chain().focus().setHighlight({ color: color.value }).run();
                  } else {
                    editor.chain().focus().unsetHighlight().run();
                  }
                }}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="editor-toolbar-separator" />

      {/* Link */}
      <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${editor.isActive("link") ? "bg-secondary" : ""}`}
          >
            <LinkIcon className="w-4 h-4" weight={editor.isActive("link") ? "bold" : "regular"} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://exemplo.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLink();
                }
              }}
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={setLink}>
              {editor.isActive("link") ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
          {editor.isActive("link") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-destructive"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setShowLinkInput(false);
              }}
            >
              Remover link
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {/* Image Insertion */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Inserir imagem"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir imagem</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="url">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">URL</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && insertImageFromUrl()}
                />
                <Button onClick={insertImageFromUrl} disabled={!imageUrl}>
                  Inserir
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="inline-image-upload"
                  onChange={(e) => handleImageUpload(e.target.files)}
                  disabled={uploading}
                />
                <label htmlFor="inline-image-upload" className="cursor-pointer">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? "Enviando..." : "Clique para selecionar uma imagem"}
                  </p>
                </label>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <div className="editor-toolbar-separator" />

      {/* Lists */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("bulletList") ? "bg-secondary" : ""}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListBullets className="w-4 h-4" />
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("orderedList") ? "bg-secondary" : ""}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListNumbers className="w-4 h-4" />
      </Button>

      <div className="editor-toolbar-separator" />

      {/* Quote & Code */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("blockquote") ? "bg-secondary" : ""}`}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quotes className="w-4 h-4" />
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive("code") ? "bg-secondary" : ""}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="w-4 h-4" />
      </Button>
    </div>
  );
}
