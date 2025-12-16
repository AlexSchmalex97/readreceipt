import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ReviewDialog({
  open,
  onClose,
  userId,
  bookId,
  existingReview,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  bookId: string;
  existingReview?: { id: string; rating: number; review: string | null } | null;
  onSaved?: () => void;
}) {
  const [rating, setRating] = useState<number>(existingReview?.rating ?? 5);
  const [text, setText] = useState(existingReview?.review ?? "");

  useEffect(() => {
    if (open) {
      setRating(existingReview?.rating ?? 5);
      setText(existingReview?.review ?? "");
    }
  }, [open, existingReview]);

  if (!open) return null;

  const save = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("reviews")
      .upsert(
        [{ user_id: userId, book_id: bookId, rating, review: text }],
        { onConflict: "user_id,book_id" }
      );
    if (!error) {
      onSaved?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border border-border p-4 w-full max-w-md space-y-4 shadow-card">
        <div className="text-lg font-semibold text-primary">Rate this book</div>

        {/* Stars */}
        <div className="flex gap-2" role="radiogroup" aria-label="Rating from 1 to 5 stars">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n <= rating;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-pressed={active}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className={`px-3 py-2 rounded border transition
                  ${active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted hover:border-primary/50"
                  }`}
              >
                {n}★
              </button>
            );
          })}
        </div>

        {/* Text */}
        <textarea
          className="w-full rounded border border-border p-2 bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          rows={4}
          placeholder="What did you think?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border border-border rounded bg-background hover:bg-muted transition">
            Cancel
          </button>
          <button
            onClick={save}
            className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition"
          >
            Save review
          </button>
        </div>
      </div>
    </div>
  );
}
