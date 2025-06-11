'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message, Language, GetOrCreateConversationResult, AddMessageResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import {
  GREETING_MESSAGE_EN, GREETING_MESSAGE_TE,
  FAQ_CONTENT_EN, FAQ_CONTENT_TE,
  UNKNOWN_ANSWER_PHRASES_EN, UNKNOWN_ANSWER_PHRASES_TE
} from '@/lib/constants';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { answerFaq } from '@/ai/flows/faq-retrieval';
import { dynamicContentRetrieval } from '@/ai/flows/dynamic-content-retrieval';
import { checkServiceEligibility } from '@/ai/flows/service-eligibility-check';

import { getOrCreateConversation, addMessageToConversation, getMessagesForConversation } from '@/services/conversationService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

const SESSION_ID_KEY = 'tFiberChatSessionId';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(false); // General loading for AI responses
  const [isInitializing, setIsInitializing] = useState(true); // For initial session/conversation setup
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationDbId, setConversationDbId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false); // Track voice recording status

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Handle recording state changes
  const handleRecordingChange = (newState: boolean) => {
    setIsRecording(newState);
  };

  // Helper function to update messages state
  const _addMessageToState = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  // Language change handler
  const handleLanguageChange = (lang: Language) => {
    setCurrentLanguage(lang);
    setMessages([]); // Clear messages to re-trigger greeting in new language
    
    // If the chat is not ready, do nothing. The greeting will be added once initialized.
    if (isInitializing || !conversationDbId) return;

    const greetingText = lang === 'en' ? GREETING_MESSAGE_EN : GREETING_MESSAGE_TE;
    // We can call addMessage here because conversationDbId is already set in the state.
    addMessage(greetingText, 'bot');
  };

  // Message addition handler
  const addMessage = async (
    text: string,
    sender: 'user' | 'bot' | 'system',
    isEligibilityResult = false,
    eligibilityData?: {isEligible: boolean; details: string}
  ) => {
    // For system messages, add them to state but don't save to DB.
    if (sender === 'system') {
      const systemMessage: Message = {
        id: uuidv4(),
        text,
        sender: 'system',
        timestamp: new Date(),
        language: currentLanguage,
        conversationDbId: -1, 
      };
      _addMessageToState(systemMessage);
      return;
    }

    // For user/bot messages, require a valid conversation ID.
    if (!conversationDbId) {
      toast({ title: "Error", description: "Conversation not ready. Cannot send/save message.", variant: "destructive" });
      console.error("Attempted to add message without conversationDbId:", {text, sender});
      return;
    }

    const newMessage: Message = {
      id: uuidv4(), // FIX: Use uuidv4 for guaranteed unique ID
      text,
      sender,
      timestamp: new Date(),
      language: currentLanguage,
      conversationDbId: conversationDbId,
    };
    _addMessageToState(newMessage); // Add to UI first for responsiveness

    // Save the message to the database (don't save system messages).
    const messageToSave = {
      conversationDbId: conversationDbId,
      sender: newMessage.sender,
      text: newMessage.text,
      language: newMessage.language,
    };
    const saveResult: AddMessageResult = await addMessageToConversation(messageToSave);
    if (!saveResult.success) {
      console.error("Failed to save message to DB:", saveResult.error);
      toast({ title: "Message Not Saved", description: `Error: ${saveResult.error || 'Could not save message to server.'}`, variant: "destructive" });
      // Indicate send error in the UI.
      setMessages(prev => prev.map(m => m.id === newMessage.id ? {...m, text: m.text + " (Send Error)"} : m));
    }
  };

  // Message sending handler
  const handleSendMessage = async (text: string) => {
    if (!conversationDbId) {
      toast({
        title: "Chat Not Ready",
        description: "Please wait for the chat to initialize.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Add user message first
      await addMessage(text, 'user');

      // Run all API calls in parallel
      const [eligibilityOutput, faqResult, dynamicContentResult] = await Promise.all([
        checkServiceEligibility({ location: text }),
        answerFaq({ query: text, faq: currentLanguage === 'en' ? FAQ_CONTENT_EN : FAQ_CONTENT_TE }),
        dynamicContentRetrieval({ query: text })
      ]);

      // Determine which response to show
      const isActualEligibilityResponse =
        eligibilityOutput.details &&
        !eligibilityOutput.details.toLowerCase().includes("please provide") &&
        !eligibilityOutput.details.toLowerCase().includes("to check service");

      if (isActualEligibilityResponse) {
        await addMessage(eligibilityOutput.details, 'bot', true, eligibilityOutput);
      } else {
        const unknownPhrases = currentLanguage === 'en' ? UNKNOWN_ANSWER_PHRASES_EN : UNKNOWN_ANSWER_PHRASES_TE;
        const isFaqAnswerUnknown = unknownPhrases.some(phrase =>
          faqResult.answer.toLowerCase().includes(phrase.toLowerCase())
        ) || faqResult.answer.trim().length < 10;

        const isDynamicContentUnhelpful = dynamicContentResult.response.length < 20 ||
                                          dynamicContentResult.response.toLowerCase().includes("can't find") ||
                                          dynamicContentResult.response.toLowerCase().includes("could you") ||
                                          dynamicContentResult.response.toLowerCase().includes("i do not");

        // Show the best available response
        if (!isFaqAnswerUnknown) {
          await addMessage(faqResult.answer, 'bot');
        } else if (!isDynamicContentUnhelpful) {
          await addMessage(dynamicContentResult.response, 'bot');
        } else {
          await addMessage(eligibilityOutput.details, 'bot');
        }
      }
    } catch (error) {
      console.error('Message processing error:', error);
      const errorMsg = currentLanguage === 'en' 
        ? 'Sorry, I encountered an error. Please try again.' 
        : 'క్షమించండి, నేను లోపం ఎదుర్కొన్నాను. దయచేసి మళ్ళీ ప్రయత్నించండి.';
      await addMessage(errorMsg, 'bot');
      toast({
        title: currentLanguage === 'en' ? "Error" : "లోపం",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRecording(false); // Reset recording state in case it was set
    }
  };
  
  // Effect for initialization on component mount
  useEffect(() => {
    let storedSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem(SESSION_ID_KEY, storedSessionId);
    }
    setSessionId(storedSessionId);

    const initializeConversation = async (sid: string, lang: Language) => {
      setIsInitializing(true);
      try {
        const result: GetOrCreateConversationResult = await getOrCreateConversation(sid, lang);
        
        // FIX: Critical bug where initial greeting was not showing.
        // Use the returned `result.id` directly instead of relying on state.
        if (result.id !== -1 && !result.error) {
          setConversationDbId(result.id); // Set state for future use
          
          const greetingText = lang === 'en' ? GREETING_MESSAGE_EN : GREETING_MESSAGE_TE;
          
          // Manually create and add the initial message to the UI
          const greetingMessage: Message = {
            id: uuidv4(),
            text: greetingText,
            sender: 'bot',
            timestamp: new Date(),
            language: lang,
            conversationDbId: result.id,
          };
          _addMessageToState(greetingMessage);
          
          // Also save this initial message to the database in the background
          addMessageToConversation({
            conversationDbId: result.id,
            sender: greetingMessage.sender,
            text: greetingMessage.text,
            language: greetingMessage.language,
          }).then(saveResult => {
            if (!saveResult.success) {
              console.error("Failed to save initial greeting message to DB:", saveResult.error);
            }
          });

        } else {
          console.error('Conversation initialization failed:', result.error);
          toast({
            title: 'Initialization Error',
            description: result.error || 'Could not initialize chat session. Please refresh.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Unexpected error during conversation initialization:', error);
        toast({
          title: 'System Error',
          description: 'An unexpected error occurred. Please refresh the page.',
          variant: 'destructive',
        });
      } finally {
        setIsInitializing(false);
      }
    };

    if (storedSessionId) {
      initializeConversation(storedSessionId, currentLanguage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // FIX: Removed redundant and inefficient useEffect that was here.

  // Effect for auto-scrolling
  useEffect(() => {
    // NOTE: This scrolling logic depends on the internal DOM structure of the
    // ScrollArea component (data-radix-scroll-area-viewport). If the library
    // is updated, this might need to be adjusted.
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-card shadow-2xl rounded-lg overflow-hidden">
      <header className="p-4 border-b border-border bg-blue-900 text-white flex items-center justify-center gap-4">
        <img src="/images/tera-icon.png" alt="TeRA Logo" className="w-12 h-12 rounded-full" />
        <div className="flex items-center">
          <span className="text-xl font-headline">Ask TeRA - Telangana Rising Agent</span>
        </div>
      </header>
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex justify-start items-center ml-3 mb-4">
              <div className="p-3 rounded-lg shadow-md bg-muted text-muted-foreground font-body">
                <Loader2 size={20} className="animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <ChatInput
        onSendMessage={handleSendMessage}
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        isSending={isLoading || isInitializing} 
        isRecording={isRecording}
        setIsRecording={handleRecordingChange}
      />
    </div>
  );
}