import { useState } from "react";
import { AuthorModal } from "@/components/post/AuthorModal";
import { supabase } from "@/integrations/supabase/client";

interface Author {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  education: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
}

export function MentionText({ text }: { text: string }) {
  const [mentionAuthor, setMentionAuthor] = useState<Author | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleMentionClick = async (name: string) => {
    const cleanName = name.replace('@', '').trim();
    try {
      // Try exact match first
      let { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, education, instagram_url, linkedin_url')
        .ilike('full_name', cleanName)
        .limit(1)
        .maybeSingle();

      // Fallback: partial match
      if (!data) {
        const partial = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, education, instagram_url, linkedin_url')
          .ilike('full_name', `%${cleanName}%`)
          .limit(1)
          .maybeSingle();
        data = partial.data;
      }

      if (data) {
        setMentionAuthor(data);
        setShowModal(true);
        return;
      }

      // Try companies
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, logo_url, description, instagram_url, linkedin_url, industry')
        .ilike('name', cleanName)
        .limit(1)
        .maybeSingle();

      if (!companyData) {
        const partial = await supabase
          .from('companies')
          .select('id, name, logo_url, description, instagram_url, linkedin_url, industry')
          .ilike('name', `%${cleanName}%`)
          .limit(1)
          .maybeSingle();
        if (partial.data) {
          setMentionAuthor({
            id: partial.data.id,
            full_name: partial.data.name,
            avatar_url: partial.data.logo_url,
            bio: partial.data.description,
            education: partial.data.industry,
            instagram_url: partial.data.instagram_url,
            linkedin_url: partial.data.linkedin_url,
          });
          setShowModal(true);
        }
        return;
      }

      if (companyData) {
        setMentionAuthor({
          id: companyData.id,
          full_name: companyData.name,
          avatar_url: companyData.logo_url,
          bio: companyData.description,
          education: companyData.industry,
          instagram_url: companyData.instagram_url,
          linkedin_url: companyData.linkedin_url,
        });
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error fetching mention:', err);
    }
  };

  const mentionRegex = /(@[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+(?:(?:d[aeo]s?|e)\s+)?[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)*)/;
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const combinedRegex = new RegExp(`${urlRegex.source}|${mentionRegex.source}`, 'g');
  const parts = text.split(combinedRegex).filter(Boolean);

  return (
    <>
      <p className="text-sm text-foreground/90 leading-relaxed">
        {parts.map((part, i) => {
          if (!part) return null;
          if (/^https?:\/\//.test(part)) {
            return (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline break-all"
              >
                {part}
              </a>
            );
          }
          if (part.startsWith("@")) {
            return (
              <button
                key={i}
                onClick={() => handleMentionClick(part)}
                className="text-primary font-medium hover:underline cursor-pointer"
              >
                {part}
              </button>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
      <AuthorModal
        author={mentionAuthor}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
