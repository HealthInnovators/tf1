'use client';

import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import TeraAvatar from '@/components/icons/TeraAvatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// In ChatMessage.tsx
const botIcon = (
  <div className="flex items-center justify-center w-8 h-8">
    <img src="/images/custom-icon.png" alt="Bot Icon" className="h-6 w-6" />
  </div>
);

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const alignment = isUser ? 'items-end' : 'items-start';
  const bubbleColor = isUser ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground';
  const textAlign = isUser ? 'text-right' : 'text-left';

  return (
    <div className={cn('flex flex-col mb-4 animate-in fade-in duration-300', alignment)}>
      <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
        <Avatar className="shadow">
          {isUser ? (
            <AvatarFallback className="bg-accent text-accent-foreground">
              <User size={24} />
            </AvatarFallback>
          ) : (
            <AvatarImage src="/images/tera-icon.png" className="rounded-full" />
          )}
        </Avatar>
        <div
          className={cn(
            'max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-md font-body',
            bubbleColor
          )}
        >
          {message.isEligibilityResult && message.eligibility ? (
            <Card className="bg-card text-card-foreground shadow-none border-none p-0">
              <CardHeader className="p-0 pb-2">
                <CardTitle className={cn('font-headline text-base', textAlign)}>Service Eligibility</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className={cn('text-sm mb-1', message.eligibility.isEligible ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', textAlign)}>
                  {message.eligibility.isEligible ? 'Service Available' : 'Service Not Available'}
                </p>
                <p className={cn('text-xs', textAlign)}>{message.eligibility.details}</p>
              </CardContent>
            </Card>
          ) : (
            <p className="whitespace-pre-wrap">{message.text}</p>
          )}
        </div>
      </div>
      <p className={cn('text-xs text-muted-foreground mt-1', isUser ? 'mr-12' : 'ml-12', textAlign)}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
}
