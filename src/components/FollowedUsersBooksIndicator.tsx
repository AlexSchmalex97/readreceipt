import { Users, BookOpen, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FollowedUserBook {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: 'in_progress' | 'completed' | 'dnf' | 'tbr';
  bookTitle: string;
  bookAuthor: string;
}

interface FollowedUsersBooksIndicatorProps {
  followedUserBooks: FollowedUserBook[];
  isLoading?: boolean;
}

const getStatusIcon = (status: FollowedUserBook['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case 'in_progress':
      return <BookOpen className="w-3 h-3 text-blue-500" />;
    case 'dnf':
      return <XCircle className="w-3 h-3 text-red-500" />;
    case 'tbr':
      return <Clock className="w-3 h-3 text-yellow-500" />;
    default:
      return <BookOpen className="w-3 h-3 text-muted-foreground" />;
  }
};

const getStatusLabel = (status: FollowedUserBook['status']) => {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'in_progress':
      return 'reading';
    case 'dnf':
      return 'DNF';
    case 'tbr':
      return 'TBR';
    default:
      return status;
  }
};

export function FollowedUsersBooksIndicator({ followedUserBooks, isLoading }: FollowedUsersBooksIndicatorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
        <Users className="w-3 h-3 animate-pulse" />
        <span>Checking followed users...</span>
      </div>
    );
  }

  if (followedUserBooks.length === 0) {
    return null;
  }

  // Group by user to show unique users first
  const userMap = new Map<string, FollowedUserBook[]>();
  followedUserBooks.forEach(book => {
    if (!userMap.has(book.userId)) {
      userMap.set(book.userId, []);
    }
    userMap.get(book.userId)!.push(book);
  });

  const uniqueUsers = Array.from(userMap.entries());
  const displayLimit = 3;
  const displayUsers = uniqueUsers.slice(0, displayLimit);
  const remainingCount = uniqueUsers.length - displayLimit;

  return (
    <div className="bg-accent/30 border border-border rounded-lg p-2 mt-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
        <Users className="w-3.5 h-3.5 text-primary" />
        <span>People you follow have this book:</span>
      </div>
      <div className="space-y-1.5">
        {displayUsers.map(([userId, books]) => {
          const firstBook = books[0];
          const statuses = [...new Set(books.map(b => b.status))];
          
          // Build link to the appropriate list with book highlighted
          const getListUrl = (status: FollowedUserBook['status']) => {
            const bookParam = encodeURIComponent(firstBook.bookTitle);
            switch (status) {
              case 'completed':
                return `/${firstBook.username}/completed?book=${bookParam}`;
              case 'in_progress':
                return `/${firstBook.username}/in-progress?book=${bookParam}`;
              case 'tbr':
                return `/${firstBook.username}/tbr?book=${bookParam}`;
              default:
                return `/${firstBook.username}`;
            }
          };
          
          // Use the first status for the main link
          const primaryStatus = statuses[0];
          
          return (
            <Link 
              key={userId} 
              to={getListUrl(primaryStatus)}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50 transition-colors"
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={firstBook.avatarUrl || undefined} />
                <AvatarFallback className="text-[8px]">
                  {(firstBook.displayName || firstBook.username).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate">
                {firstBook.displayName || `@${firstBook.username}`}
              </span>
              <div className="flex items-center gap-1 ml-auto">
                {statuses.map(status => (
                  <div key={status} className="flex items-center gap-0.5" title={getStatusLabel(status)}>
                    {getStatusIcon(status)}
                    <span className="text-[10px] text-muted-foreground">{getStatusLabel(status)}</span>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
        {remainingCount > 0 && (
          <p className="text-[10px] text-muted-foreground pl-1.5">
            +{remainingCount} more {remainingCount === 1 ? 'person' : 'people'}
          </p>
        )}
      </div>
    </div>
  );
}
