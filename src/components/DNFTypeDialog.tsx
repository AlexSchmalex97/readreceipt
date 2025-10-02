import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DNFTypeDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: 'soft' | 'hard') => void;
  bookTitle: string;
}

export function DNFTypeDialog({ open, onClose, onSelect, bookTitle }: DNFTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Did Not Finish</DialogTitle>
          <DialogDescription>
            How would you classify this DNF for "{bookTitle}"?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Button
              onClick={() => onSelect('soft')}
              className="w-full justify-start text-left h-auto py-4"
              variant="outline"
            >
              <div>
                <div className="font-semibold">Soft DNF</div>
                <div className="text-sm text-muted-foreground">
                  Not the right time - might read later
                </div>
              </div>
            </Button>
            
            <Button
              onClick={() => onSelect('hard')}
              className="w-full justify-start text-left h-auto py-4"
              variant="outline"
            >
              <div>
                <div className="font-semibold">Hard DNF</div>
                <div className="text-sm text-muted-foreground">
                  Won't finish - not for me
                </div>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
