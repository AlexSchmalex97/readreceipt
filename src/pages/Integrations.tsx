import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { exportToGoodreadsCSV, downloadCSV } from "@/lib/csvExport";
import { importGoodreadsCSV } from "@/lib/csvImport";

const Integrations = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not logged in",
          description: "Please log in to export your library",
          variant: "destructive",
        });
        return;
      }

      const csvContent = await exportToGoodreadsCSV(user.id);
      const timestamp = new Date().toISOString().split("T")[0];
      downloadCSV(csvContent, `readreceipt-export-${timestamp}.csv`);

      toast({
        title: "Export successful",
        description: "Your library has been exported to CSV format",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not logged in",
          description: "Please log in to import books",
          variant: "destructive",
        });
        return;
      }

      const csvContent = await file.text();
      const { imported, errors } = await importGoodreadsCSV(csvContent, user.id);

      toast({
        title: "Import complete",
        description: `Successfully imported ${imported} books${errors.length > 0 ? `. ${errors.length} errors occurred.` : ""}`,
      });

      if (errors.length > 0) {
        console.error("Import errors:", errors);
      }
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Integrations</h1>

        {/* Goodreads CSV Import/Export */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Goodreads CSV</CardTitle>
            <CardDescription>
              Import your Goodreads library or export your ReadReceipt library in Goodreads CSV format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={handleExport} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export to CSV"}
              </Button>
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? "Importing..." : "Import CSV"}
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleImport}
                    disabled={isImporting}
                  />
                </label>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Export your library to import into Goodreads, or import your Goodreads export here.
            </p>
          </CardContent>
        </Card>

        {/* StoryGraph */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              StoryGraph
              <span className="text-sm font-normal text-muted-foreground">Coming Soon</span>
            </CardTitle>
            <CardDescription>
              Connect with StoryGraph to sync your reading activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect StoryGraph
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              StoryGraph integration will be available in a future update.
            </p>
          </CardContent>
        </Card>

        {/* Fable */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Fable
              <span className="text-sm font-normal text-muted-foreground">Coming Soon</span>
            </CardTitle>
            <CardDescription>
              Connect with Fable to share reading progress with your book clubs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect Fable
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Fable integration will be available in a future update.
            </p>
          </CardContent>
        </Card>

        {/* Bookly */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Bookly
              <span className="text-sm font-normal text-muted-foreground">Coming Soon</span>
            </CardTitle>
            <CardDescription>
              Connect with Bookly to track your reading statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect Bookly
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Bookly integration will be available in a future update.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Integrations;
