import { useState, useEffect } from 'react';
import { RefreshCw, Quote } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type QuoteData = {
  text: string;
  author: string;
  source?: string; // book title if it's from a book
};

const inspirationalQuotes: QuoteData[] = [
  {
    text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
    author: "Dr. Seuss",
    source: "I Can Read With My Eyes Shut!"
  },
  {
    text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.",
    author: "George R.R. Martin"
  },
  {
    text: "Books are a uniquely portable magic.",
    author: "Stephen King",
    source: "On Writing"
  },
  {
    text: "Reading is to the mind what exercise is to the body.",
    author: "Joseph Addison"
  },
  {
    text: "There is no friend as loyal as a book.",
    author: "Ernest Hemingway"
  },
  {
    text: "So many books, so little time.",
    author: "Frank Zappa"
  },
  {
    text: "The person, be it gentleman or lady, who has not pleasure in a good novel, must be intolerably stupid.",
    author: "Jane Austen",
    source: "Northanger Abbey"
  },
  {
    text: "You can never get a cup of tea large enough or a book long enough to suit me.",
    author: "C.S. Lewis"
  },
  {
    text: "Reading gives us someplace to go when we have to stay where we are.",
    author: "Mason Cooley"
  },
  {
    text: "A book is a dream that you hold in your hand.",
    author: "Neil Gaiman"
  },
  {
    text: "Libraries were full of ideas–perhaps the most dangerous and powerful of all weapons.",
    author: "Sarah J. Maas",
    source: "Throne of Glass"
  },
  {
    text: "Words are, in my not-so-humble opinion, our most inexhaustible source of magic.",
    author: "J.K. Rowling",
    source: "Harry Potter and the Deathly Hallows"
  },
  {
    text: "Think before you speak. Read before you think.",
    author: "Fran Lebowitz"
  },
  {
    text: "Reading is escape, and the opposite of escape; it's a way to make contact with reality after a day of making things up.",
    author: "Nora Ephron"
  },
  {
    text: "A good book is an event in my life.",
    author: "Stendhal"
  },
  {
    text: "Books fall open, you fall in, delighted where you've never been.",
    author: "David T.W. McCord"
  },
  {
    text: "Today a reader, tomorrow a leader.",
    author: "Margaret Fuller"
  },
  {
    text: "The only thing you absolutely have to know is the location of the library.",
    author: "Albert Einstein"
  },
  {
    text: "Books are mirrors: you only see in them what you already have inside you.",
    author: "Carlos Ruiz Zafón",
    source: "The Shadow of the Wind"
  },
  {
    text: "Once you learn to read, you will be forever free.",
    author: "Frederick Douglass"
  }
];

type QuotesDisplayProps = {
  compact?: boolean;
};

export function QuotesDisplay({ compact = false }: QuotesDisplayProps) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentQuote = inspirationalQuotes[currentQuoteIndex];

  // Auto-rotate quotes every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % inspirationalQuotes.length);
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  // Manual quote change on click
  const handleQuoteChange = () => {
    setIsRefreshing(true);
    setCurrentQuoteIndex((prev) => (prev + 1) % inspirationalQuotes.length);
    
    // Reset refresh animation after a short delay
    setTimeout(() => setIsRefreshing(false), 300);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/10 rounded-lg transition-colors ${
              compact 
                ? 'max-w-full' 
                : 'max-w-full sm:max-w-lg'
            }`}
            onClick={handleQuoteChange}
          >
            <Quote className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-primary flex-shrink-0`} />
            
            <div className="flex-1 min-w-0">
              <div className={`${
                compact 
                  ? 'text-xs' 
                  : 'text-sm sm:text-base'
              } text-[hsl(30,25%,20%)] dark:text-[hsl(35,30%,92%)] font-medium italic leading-tight line-clamp-2`}>
                "{currentQuote.text}"
              </div>
              <div className={`${compact ? 'text-[10px]' : 'text-xs sm:text-sm'} text-[hsl(30,15%,40%)] dark:text-[hsl(35,18%,70%)] mt-0.5`}>
                — {currentQuote.author}
              </div>
            </div>
            
            <RefreshCw 
              className={`${compact ? 'w-3 h-3' : 'w-5 h-5'} text-[hsl(30,15%,40%)] dark:text-[hsl(35,18%,70%)] flex-shrink-0 transition-transform ${
                isRefreshing ? 'animate-spin' : 'hover:rotate-180'
              }`} 
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm p-3">
          <div className="text-sm font-medium italic text-[hsl(30,25%,20%)] dark:text-[hsl(35,30%,92%)]">
            "{currentQuote.text}"
          </div>
          <div className="text-xs text-[hsl(30,15%,40%)] dark:text-[hsl(35,18%,70%)] mt-1">
            — {currentQuote.author}
            {currentQuote.source && (
              <span className="text-[hsl(30,25%,20%)] dark:text-[hsl(35,30%,92%)]"> ({currentQuote.source})</span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}