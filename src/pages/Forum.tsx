import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { getForumPosts, createForumPost, addForumReply } from '@/lib/storage';
import { ForumPost } from '@/types';
import { MessageSquare, PlusCircle, Send, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const Forum: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = () => {
    const allPosts = getForumPosts();
    setPosts(allPosts.reverse());
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    createForumPost({
      userId: user.id,
      userName: user.name,
      title: newPostTitle,
      content: newPostContent,
    });

    toast({
      title: 'Post created!',
      description: 'Your discussion topic has been posted.',
    });

    setNewPostTitle('');
    setNewPostContent('');
    setIsDialogOpen(false);
    loadPosts();
  };

  const handleReply = (postId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const content = replyContent[postId];
    if (!content?.trim()) return;

    addForumReply(postId, {
      userId: user.id,
      userName: user.name,
      content,
    });

    setReplyContent(prev => ({ ...prev, [postId]: '' }));
    loadPosts();
    toast({
      title: 'Reply posted!',
      description: 'Your reply has been added to the discussion.',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Community Forum</h1>
            <p className="text-muted-foreground">
              Connect with fellow learners and share your experiences
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Discussion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a Discussion</DialogTitle>
                <DialogDescription>
                  Share a question, insight, or experience with the community
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePost}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="What's on your mind?"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Share your thoughts..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      rows={5}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Post</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No discussions yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to start a conversation!
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                Start a Discussion
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{post.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-xl mt-4">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{post.content}</p>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                    className="text-muted-foreground"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
                  </Button>

                  {expandedPost === post.id && (
                    <div className="space-y-4 pt-4 border-t">
                      {/* Replies */}
                      {post.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3 pl-4 border-l-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{reply.userName}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{reply.content}</p>
                          </div>
                        </div>
                      ))}

                      {/* Reply Input */}
                      {user && (
                        <div className="flex gap-3 pl-4">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 flex gap-2">
                            <Input
                              placeholder="Write a reply..."
                              value={replyContent[post.id] || ''}
                              onChange={(e) => setReplyContent(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleReply(post.id);
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              onClick={() => handleReply(post.id)}
                              disabled={!replyContent[post.id]?.trim()}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {!user && (
                        <p className="text-sm text-muted-foreground pl-4">
                          <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth')}>
                            Log in
                          </Button>
                          {' '}to join the discussion
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Forum;
