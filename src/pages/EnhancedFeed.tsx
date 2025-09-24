import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Heart, MessageCircle, Edit2, Trash2, Send, Plus, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Post = {
  kind: "post";
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  content: string;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
};

type ProgressItem = {
  kind: "progress";
  id: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover_url?: string | null;
  from_page: number | null;
  to_page: number;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
};

type ReviewItem = {
  kind: "review";
  id: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover_url?: string | null;
  rating: number;
  review: string | null;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
};

type FeedItem = Post | ProgressItem | ReviewItem;

type Comment = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function EnhancedFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    // Get current user
    const { data: me, error: userError } = await supabase.auth.getUser();
    const myId = me?.user?.id;
    if (!myId) { 
      setItems([]); 
      setLoading(false); 
      return; 
    }
    setCurrentUserId(myId);

    // Get followed user IDs
    const { data: followRows } = await supabase
      .from("follows").select("following_id").eq("follower_id", myId);
    const followingIds = (followRows ?? []).map(r => r.following_id);
    const targetIds = [myId, ...followingIds.filter((id: string) => id !== myId)];

    // Get profile information
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", targetIds);
    const profileMap = new Map(profiles?.map(p => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]) || []);

    // Load posts
    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", targetIds)
      .order("created_at", { ascending: false })
      .limit(50);

    // Load reading progress
    const { data: progress } = await supabase
      .from("reading_progress")
      .select(`
        id, created_at, user_id, from_page, to_page, book_id,
        books!reading_progress_book_id_fkey ( title, author, cover_url )
      `)
      .in("user_id", targetIds)
      .order("created_at", { ascending: false })
      .limit(50);

    // Load reviews
    const { data: reviews } = await supabase
      .from("reviews")
      .select(`
        id, created_at, user_id, rating, review, book_id,
        books!reviews_book_id_fkey ( title, author, cover_url )
      `)
      .in("user_id", targetIds)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get likes and comments counts
    const allItemIds = [
      ...(posts || []).map(p => ({ id: p.id, type: 'post' })),
      ...(progress || []).map(p => ({ id: p.id, type: 'progress' })),
      ...(reviews || []).map(r => ({ id: r.id, type: 'review' }))
    ];

    const likesData = await Promise.all(
      allItemIds.map(async ({ id, type }) => {
        const { data: likes } = await supabase
          .from("likes")
          .select("id, user_id")
          .eq("target_id", id)
          .eq("target_type", type);
        
        return {
          id,
          type,
          likes_count: likes?.length || 0,
          user_liked: likes?.some(l => l.user_id === myId) || false
        };
      })
    );

    const commentsData = await Promise.all(
      allItemIds.map(async ({ id, type }) => {
        const { data: comments } = await supabase
          .from("comments")
          .select("id")
          .eq("target_id", id)
          .eq("target_type", type);
        
        return {
          id,
          type,
          comments_count: comments?.length || 0
        };
      })
    );

    const likesMap = new Map(likesData.map(l => [`${l.type}-${l.id}`, { likes_count: l.likes_count, user_liked: l.user_liked }]));
    const commentsMap = new Map(commentsData.map(c => [`${c.type}-${c.id}`, c.comments_count]));

    // Transform data to feed items
    const postItems: Post[] = (posts || []).map(p => ({
      kind: "post",
      id: p.id,
      created_at: p.created_at,
      updated_at: p.updated_at,
      user_id: p.user_id,
      display_name: profileMap.get(p.user_id)?.display_name ?? null,
      avatar_url: profileMap.get(p.user_id)?.avatar_url ?? null,
      content: p.content,
      likes_count: likesMap.get(`post-${p.id}`)?.likes_count || 0,
      comments_count: commentsMap.get(`post-${p.id}`) || 0,
      user_liked: likesMap.get(`post-${p.id}`)?.user_liked || false,
    }));

    const progressItems: ProgressItem[] = (progress || []).map((r: any) => ({
      kind: "progress",
      id: r.id,
      created_at: r.created_at,
      user_id: r.user_id,
      display_name: profileMap.get(r.user_id)?.display_name ?? null,
      avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
      book_title: r.books?.title ?? null,
      book_author: r.books?.author ?? null,
      book_cover_url: r.books?.cover_url ?? null,
      from_page: r.from_page ?? null,
      to_page: r.to_page,
      likes_count: likesMap.get(`progress-${r.id}`)?.likes_count || 0,
      comments_count: commentsMap.get(`progress-${r.id}`) || 0,
      user_liked: likesMap.get(`progress-${r.id}`)?.user_liked || false,
    }));

    const reviewItems: ReviewItem[] = (reviews || []).map((r: any) => ({
      kind: "review",
      id: r.id,
      created_at: r.created_at,
      user_id: r.user_id,
      display_name: profileMap.get(r.user_id)?.display_name ?? null,
      avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
      book_title: r.books?.title ?? null,
      book_author: r.books?.author ?? null,
      book_cover_url: r.books?.cover_url ?? null,
      rating: r.rating,
      review: r.review,
      likes_count: likesMap.get(`review-${r.id}`)?.likes_count || 0,
      comments_count: commentsMap.get(`review-${r.id}`) || 0,
      user_liked: likesMap.get(`review-${r.id}`)?.user_liked || false,
    }));

    // Merge and sort by date
    const merged = [...postItems, ...progressItems, ...reviewItems].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
    );

    setItems(merged);
    setLoading(false);
  };

  const handleLike = async (item: FeedItem) => {
    if (!currentUserId) return;

    const targetType = item.kind;
    const targetId = item.id;

    if (item.user_liked) {
      // Unlike
      await supabase
        .from("likes")
        .delete()
        .eq("user_id", currentUserId)
        .eq("target_type", targetType)
        .eq("target_id", targetId);
    } else {
      // Like
      await supabase
        .from("likes")
        .insert({
          user_id: currentUserId,
          target_type: targetType,
          target_id: targetId
        });
    }

    // Update local state
    setItems(prev => prev.map(i => 
      i.id === item.id 
        ? { 
            ...i, 
            user_liked: !i.user_liked,
            likes_count: i.user_liked ? i.likes_count - 1 : i.likes_count + 1
          }
        : i
    ));
  };

  const handleCreatePost = async () => {
    if (!currentUserId || !newPostContent.trim()) return;

    const { error } = await supabase
      .from("posts")
      .insert({
        user_id: currentUserId,
        content: newPostContent.trim()
      });

    if (error) {
      toast({
        title: "Error creating post",
        description: "Please try again",
        variant: "destructive"
      });
      return;
    }

    setNewPostContent("");
    setShowNewPostDialog(false);
    loadFeed(); // Reload feed
    toast({
      title: "Post created!",
      description: "Your post has been shared with your followers."
    });
  };

  const handleEditPost = async (postId: string) => {
    if (!editContent.trim()) return;

    const { error } = await supabase
      .from("posts")
      .update({ content: editContent.trim() })
      .eq("id", postId);

    if (error) {
      toast({
        title: "Error updating post",
        variant: "destructive"
      });
      return;
    }

    setEditingPost(null);
    setEditContent("");
    loadFeed();
    toast({ title: "Post updated!" });
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) {
      toast({
        title: "Error deleting post",
        variant: "destructive"
      });
      return;
    }

    loadFeed();
    toast({ title: "Post deleted" });
  };

  const loadComments = async (targetType: string, targetId: string) => {
    const { data: commentsData } = await supabase
      .from("comments")
      .select(`
        id, content, created_at, updated_at, user_id,
        profiles!comments_user_id_fkey(display_name, avatar_url)
      `)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .order("created_at", { ascending: true });

    if (commentsData) {
      const processedComments = commentsData.map((c: any) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        updated_at: c.updated_at,
        user_id: c.user_id,
        display_name: c.profiles?.display_name || "Unknown User",
        avatar_url: c.profiles?.avatar_url || null
      }));

      setComments(prev => ({
        ...prev,
        [`${targetType}-${targetId}`]: processedComments
      }));
    }
  };

  const toggleComments = async (item: FeedItem) => {
    const key = `${item.kind}-${item.id}`;
    if (showComments[key]) {
      setShowComments(prev => ({ ...prev, [key]: false }));
    } else {
      setShowComments(prev => ({ ...prev, [key]: true }));
      await loadComments(item.kind, item.id);
    }
  };

  const handleAddComment = async (item: FeedItem) => {
    if (!currentUserId) return;
    
    const commentText = newComment[`${item.kind}-${item.id}`];
    if (!commentText?.trim()) return;

    const { error } = await supabase
      .from("comments")
      .insert({
        user_id: currentUserId,
        target_type: item.kind,
        target_id: item.id,
        content: commentText.trim()
      });

    if (error) {
      toast({
        title: "Error adding comment",
        variant: "destructive"
      });
      return;
    }

    setNewComment(prev => ({ ...prev, [`${item.kind}-${item.id}`]: "" }));
    await loadComments(item.kind, item.id);
    
    // Update comment count
    setItems(prev => prev.map(i => 
      i.id === item.id 
        ? { ...i, comments_count: i.comments_count + 1 }
        : i
    ));
  };

  const renderFeedItem = (item: FeedItem) => {
    const isOwner = item.user_id === currentUserId;
    const commentsKey = `${item.kind}-${item.id}`;
    const itemComments = comments[commentsKey] || [];

    return (
      <div key={`${item.kind}-${item.id}`} className="bg-card p-4 rounded border">
        <div className="flex items-start gap-3 mb-3">
          <img
            src={item.avatar_url || "/assets/readreceipt-logo.png"}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="font-medium">{item.display_name || "Reader"}</div>
              {isOwner && item.kind === "post" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditingPost(item.id);
                      setEditContent(item.content);
                    }}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeletePost(item.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(item.created_at).toLocaleString()}
              {item.kind === "post" && item.updated_at !== item.created_at && " • edited"}
            </div>
          </div>
        </div>
        
        {/* Content based on item type */}
        {item.kind === "post" && (
          <div className="mb-3">
            {editingPost === item.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEditPost(item.id)}>
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setEditingPost(null);
                      setEditContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{item.content}</p>
            )}
          </div>
        )}

        {(item.kind === "progress" || item.kind === "review") && (
          <div className="flex gap-3 mb-3">
            {item.book_cover_url ? (
              <img 
                src={item.book_cover_url} 
                alt={item.book_title || "Book cover"}
                className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              {item.kind === "progress" && (
                <div>
                  <div className="font-medium mb-1">Reading Progress</div>
                  <div>
                    Read to page {item.to_page}
                    {typeof item.from_page === "number" && item.from_page >= 0 ? ` (from ${item.from_page})` : ""} of{" "}
                    <em className="truncate">{item.book_title ?? "Untitled"}</em>
                    {item.book_author ? ` by ${item.book_author}` : ""}
                  </div>
                </div>
              )}
              
              {item.kind === "review" && (
                <div>
                  <div className="font-medium mb-1">
                    Reviewed <em className="truncate">{item.book_title ?? "Untitled"}</em>
                    {item.book_author ? ` by ${item.book_author}` : ""}: ⭐ {item.rating}/5
                  </div>
                  {item.review && <p className="text-sm text-muted-foreground">{item.review}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Engagement buttons */}
        <div className="flex items-center gap-4 py-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLike(item)}
            className={`gap-2 ${item.user_liked ? 'text-red-500' : ''}`}
          >
            <Heart className={`w-4 h-4 ${item.user_liked ? 'fill-current' : ''}`} />
            {item.likes_count}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleComments(item)}
            className="gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            {item.comments_count}
          </Button>
        </div>

        {/* Comments section */}
        {showComments[commentsKey] && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Add comment form */}
            <div className="flex gap-2">
              <Input
                placeholder="Write a comment..."
                value={newComment[commentsKey] || ""}
                onChange={(e) => setNewComment(prev => ({ ...prev, [commentsKey]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment(item);
                  }
                }}
              />
              <Button 
                size="sm" 
                onClick={() => handleAddComment(item)}
                disabled={!newComment[commentsKey]?.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Comments list */}
            {itemComments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <img
                  src={comment.avatar_url || "/assets/readreceipt-logo.png"}
                  alt="Profile"
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 bg-muted/30 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{comment.display_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleString()}
                        {comment.updated_at !== comment.created_at && " • edited"}
                      </span>
                      {comment.user_id === currentUserId && (
                        <Button variant="ghost" size="sm" className="h-auto p-1">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Navigation />
        <div className="p-6 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Feed</h1>
          
          {currentUserId && (
            <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a new post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="What's on your mind about reading?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={4}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => {
                      setShowNewPostDialog(false);
                      setNewPostContent("");
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim()}
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">
            No activity yet. Follow readers in the <a href="/people" className="underline">People</a> tab or create your first post!
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(renderFeedItem)}
          </div>
        )}
      </div>
    </div>
  );
}