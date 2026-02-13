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
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, education, instagram_url, linkedin_url')
        .ilike('full_name', cleanName)
        .limit(1)
        .maybeSingle();

      if (data) {
        setMentionAuthor(data);
        setShowModal(true);
        return;
      }

      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, logo_url, description, instagram_url, linkedin_url, industry')
        .ilike('name', cleanName)
        .limit(1)
        .maybeSingle();

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

  // Regex: captures @Name with capitalized words (supports accented chars)
  const parts = text.split(/(@[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)*)/g);

  return (
    <>
      <p className="text-sm text-foreground/90 leading-relaxed">
        {parts.map((part, i) =>
          part.startsWith("@") ? (
            <button
              key={i}
              onClick={() => handleMentionClick(part)}
              className="text-primary font-medium hover:underline cursor-pointer"
            >
              {part}
            </button>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
      <AuthorModal
        author={mentionAuthor}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
