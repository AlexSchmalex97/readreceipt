import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, HelpCircle, Send, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/hooks/usePlatform";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    type: "general"
  });
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { toast } = useToast();
  const { isIOS, isReadReceiptApp } = usePlatform();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create mailto link to direct email to support@readreceiptapp.com
    const subject = encodeURIComponent(`[${formData.type.toUpperCase()}] ${formData.subject}`);
    const body = encodeURIComponent(`
Name: ${formData.name}
Email: ${formData.email}
Message Type: ${formData.type}

Message:
${formData.message}
    `);
    
    const mailtoLink = `mailto:support@readreceiptapp.com?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');

    toast({
      title: "Opening email client",
      description: "Your message will be sent to support@readreceiptapp.com",
    });

    setFormData({
      name: "",
      email: "",
      subject: "",
      message: "",
      type: "general"
    });
    setIsSubmitting(false);
  };

  const handleSubscribe = async () => {
    if (!subscriberEmail.trim()) return;
    
    setIsSubscribing(true);
    
    // Open the Substack subscription page with pre-filled email
    const substackUrl = `https://readreceiptapp.substack.com/subscribe?email=${encodeURIComponent(subscriberEmail)}`;
    window.open(substackUrl, '_blank');
    
    toast({
      title: "Opening subscription page",
      description: "You'll be redirected to subscribe to ReadReceipt Updates!",
    });
    
    setSubscriberEmail("");
    setIsSubscribing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-soft pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Contact & Feedback</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Have questions about ReadReceipt? Found a bug? Want to suggest a new feature? 
            We'd love to hear from you!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Options */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Get Help
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">General Questions</h3>
                    <p className="text-sm text-muted-foreground">
                      Questions about how to use features, account issues, or general inquiries.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">Bug Reports</h3>
                    <p className="text-sm text-muted-foreground">
                      Found something that's not working correctly? Let us know!
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Send className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">Feature Requests</h3>
                    <p className="text-sm text-muted-foreground">
                      Have ideas for new features or improvements? We're all ears!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We typically respond to messages within <strong>24-48 hours</strong> during business days. 
                  For urgent issues, please include "URGENT" in your subject line.
                </p>
              </CardContent>
            </Card>

            {/* Newsletter Subscription */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  ReadReceipt Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Subscribe to our Substack newsletter for app updates, reading tips, and community highlights!
                </p>
                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={subscriberEmail}
                    onChange={(e) => setSubscriberEmail(e.target.value)}
                  />
                  <Button 
                    onClick={handleSubscribe}
                    disabled={isSubscribing || !subscriberEmail.trim()}
                    className="w-full gap-2"
                  >
                    {isSubscribing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Subscribe to Updates
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <p className="text-sm text-muted-foreground">
                  All messages will be sent to <strong>support@readreceiptapp.com</strong>
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                        Name *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                        Email *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-foreground mb-2">
                      Message Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full border border-border rounded-md px-3 py-2 bg-background"
                    >
                      <option value="general">General Question</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="account">Account Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                      Subject *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Brief description of your message"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Please provide as much detail as possible..."
                      rows={6}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}