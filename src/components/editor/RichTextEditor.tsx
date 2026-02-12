import { useEffect } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { EditorToolbar } from "./EditorToolbar";
import { MentionList, fetchMentionSuggestions, type MentionSuggestionItem } from "@/components/MentionSuggestions";
import "./editor.css";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Escreva sua publicação..." 
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full rounded-lg",
        },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: "w-full aspect-video rounded-lg",
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention text-primary font-medium cursor-pointer",
        },
        suggestion: {
          items: async ({ query }: { query: string }) => {
            return await fetchMentionSuggestions(query);
          },
          render: () => {
            let component: ReactRenderer<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }>;
            let popup: TippyInstance[];

            return {
              onStart: (props: SuggestionProps) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor as any,
                });

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate: (props: SuggestionProps) => {
                component?.updateProps(props);
                if (popup?.[0] && props.clientRect) {
                  popup[0].setProps({
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                  });
                }
              },
              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
        renderHTML({ node }) {
          const attrs = node.attrs as MentionSuggestionItem;
          return [
            "a",
            {
              class: "mention text-primary font-medium cursor-pointer",
              "data-mention-type": attrs.type || "user",
              "data-mention-id": attrs.id,
              href: attrs.type === "company" ? `/company/${attrs.slug || attrs.id}` : "#",
            },
            `@${attrs.label || attrs.id}`,
          ];
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && content && editor.isEmpty) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <EditorToolbar editor={editor} />
      <div className="max-h-[300px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function useRichTextEditor() {
  return useEditor;
}
