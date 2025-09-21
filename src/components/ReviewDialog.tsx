import { useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";

export function ReviewDialog({
  open,
  onClose,
  userId,
  bookId,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  bookId: string;
}) {
  const [rating, setRating] = useState<number>(5);
  const [text, setText] = useState("");

  if (!open) return null;

  const save = async () => {
    if (!hasSupabase || !supabase || !userId) return;
    const { error } = await supabase
      .from("reviews")
      .upsert(
        [{ user_id: userId, book_id: bookId, rating, review: text }],
        { onConflict: "user_id,book_id" }
      );
    if (!error) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border p-4 w-full max-w-md space-y-4 shadow-card">
        <div className="text-lg font-semibold">Rate this book</div>

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
                    : "bg-background hover:bg-muted"
                  }`}
              >
                {n}★
              </button>
            );
          })}
        </div>

        {/* Text */}
        <textarea
          className="w-full rounded border p-2 bg-background"
          rows={4}
          placeholder="What did you think?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={save}
            className="px-3 py-2 rounded bg-primary text-primary-foreground"
          >
            Save review
          </button>
        </div>
      </div>
    </div>
  );
}
