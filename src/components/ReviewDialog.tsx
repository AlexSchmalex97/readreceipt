import { useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";

export function ReviewDialog({ open, onClose, userId, bookId }:{
  open: boolean; onClose: () => void; userId: string; bookId: string;
}) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  if (!open) return null;

  const save = async () => {
    if (!hasSupabase || !supabase || !userId) return;
    const { error } = await supabase.from("reviews").upsert([{
      user_id: userId, book_id: bookId, rating, review: text
    }], { onConflict: "user_id,book_id" });
    if (!error) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border p-4 w-full max-w-md space-y-3">
        <div className="text-lg font-semibold">Rate this book</div>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(n => (
            <button key={n}
              onClick={() => setRating(n)}
              className={`px-2 py-1 rounded border ${n<=rating ? "bg-secondary" : ""}`}>
              {n}★
            </button>
          ))}
        </div>
        <textarea
          className="w-full rounded border p-2 bg-background"
          rows={4}
          placeholder="What did you think?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={save} className="px-3 py-2 rounded bg-primary text-primary-foreground">Save review</button>
        </div>
      </div>
    </div>
  );
}
