import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Pencil, Trash2 } from "lucide-react";

interface ReadingEntry {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  status: string;
}

interface ReadingEntriesDialogProps {
  bookId: string;
  bookTitle: string;
  onChanged?: () => void; // optional callback to refresh parent
}

export const ReadingEntriesDialog = ({ bookId, bookTitle, onChanged }: ReadingEntriesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ started_at: string; finished_at: string }>(
    { started_at: '', finished_at: '' }
  );
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (open) loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, bookId]);

  const loadEntries = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('reading_entries')
      .select('id, started_at, finished_at, status')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .order('finished_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Failed to load entries', error);
      toast({ title: 'Error loading entries', description: error.message, variant: 'destructive' });
    } else {
      setEntries((data ?? []) as any);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ started_at: '', finished_at: '' });
  };

  const handleSave = async () => {
    if (!userId) return;
    // Validate dates
    if (form.started_at && form.finished_at) {
      const s = new Date(form.started_at);
      const f = new Date(form.finished_at);
      if (f < s) {
        toast({ title: 'Invalid dates', description: 'End date cannot be before start date', variant: 'destructive' });
        return;
      }
    }

    // Auto-set status based on whether finished date is provided
    const status = form.finished_at ? 'completed' : 'in_progress';

    const payload: any = {
      user_id: userId,
      book_id: bookId,
      status,
      started_at: form.started_at || null,
      finished_at: form.finished_at || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase
        .from('reading_entries')
        .update(payload)
        .eq('id', editingId));
    } else {
      ({ error } = await supabase
        .from('reading_entries')
        .insert(payload));
    }

    if (error) {
      toast({ title: 'Error saving entry', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: editingId ? 'Entry updated' : 'Entry added', description: 'Reading dates saved' });
    resetForm();
    await loadEntries();
    onChanged?.();
    // Notify app to refresh reading goal counts
    window.dispatchEvent(new CustomEvent('reading-entries-changed'));
  };

  const handleEdit = (entry: ReadingEntry) => {
    setEditingId(entry.id);
    setForm({
      started_at: entry.started_at ?? '',
      finished_at: entry.finished_at ?? '',
    });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('reading_entries').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting entry', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Entry deleted' });
    if (editingId === id) resetForm();
    await loadEntries();
    onChanged?.();
    // Notify app to refresh reading goal counts
    window.dispatchEvent(new CustomEvent('reading-entries-changed'));
  };

  const latestFinished = useMemo(() => {
    const withFinish = entries.filter(e => e.finished_at);
    if (!withFinish.length) return null;
    return withFinish.sort((a, b) => (new Date(b.finished_at!).getTime() - new Date(a.finished_at!).getTime()))[0].finished_at;
  }, [entries]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button 
          size="icon-xs" 
          variant="outline" 
          className="sm:h-8 sm:w-8 p-0"
          title="Edit reading dates"
        >
          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] shadow-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
            Reading dates for "{bookTitle}"
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Track each time you read or re-read this book.
          </p>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Existing entries */}
          <div>
            <h3 className="text-sm font-medium mb-2">History</h3>
            <div className="space-y-2 max-h-60 overflow-auto pr-1">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : entries.length === 0 ? (
                <div className="text-sm text-muted-foreground">No reading entries yet.</div>
              ) : (
                entries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between bg-accent/50 rounded-md p-2">
                    <div className="text-sm">
                      <div className="font-medium">
                        {e.status === 'completed' ? 'Completed' : 'In progress'}
                      </div>
                      <div className="text-muted-foreground">
                        {e.started_at ? new Date(e.started_at).toLocaleDateString() : '—'}
                        {' '}→{' '}
                        {e.finished_at ? new Date(e.finished_at).toLocaleDateString() : '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(e)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Add/edit form */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="started">Date Started</Label>
                <Input
                  id="started"
                  type="date"
                  value={form.started_at}
                  onChange={(e) => setForm((f) => ({ ...f, started_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="finished">Date Finished</Label>
                <Input
                  id="finished"
                  type="date"
                  value={form.finished_at}
                  onChange={(e) => setForm((f) => ({ ...f, finished_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" /> {editingId ? 'Update entry' : 'Add entry'}
              </Button>
              {editingId && (
                <Button variant="outline" className="flex-1" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
            {latestFinished && (
              <p className="text-xs text-muted-foreground">Most recent finish: {new Date(latestFinished).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
