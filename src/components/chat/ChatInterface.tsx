
'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message, Language, GetOrCreateConversationResult, AddMessageResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import {
  GREETING_MESSAGE_EN, GREETING_MESSAGE_TE,
  FAQ_CONTENT_EN, FAQ_CONTENT_TE,
  UNKNOWN_ANSWER_PHRASES_EN, UNKNOWN_ANSWER_PHRASES_TE,
  LEAD_CAPTURE_NAME_PROMPT_EN, LEAD_CAPTURE_NAME_PROMPT_TE,
  LEAD_CAPTURE_PHONE_PROMPT_EN, LEAD_CAPTURE_PHONE_PROMPT_TE,
  LEAD_CAPTURE_THANKS_EN, LEAD_CAPTURE_THANKS_TE,
  LEAD_CAPTURE_INVALID_PHONE_EN, LEAD_CAPTURE_INVALID_PHONE_TE,
  LEAD_CAPTURE_SAVE_SUCCESS_EN, LEAD_CAPTURE_SAVE_SUCCESS_TE,
  LEAD_CAPTURE_SAVE_ERROR_EN, LEAD_CAPTURE_SAVE_ERROR_TE
} from '@/lib/constants';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { answerFaq } from '@/ai/flows/faq-retrieval';
import { dynamicContentRetrieval } from '@/ai/flows/dynamic-content-retrieval';
import { checkServiceEligibility } from '@/ai/flows/service-eligibility-check';
import { saveLead } from '@/services/leadService';
import { getOrCreateConversation, addMessageToConversation, getMessagesForConversation } from '@/services/conversationService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

type LeadCaptureStep = 'awaitingName' | 'awaitingPhoneNumber' | 'completed';
const SESSION_ID_KEY = 'tFiberChatSessionId';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(false); // General loading for AI responses, lead saving
  const [isInitializing, setIsInitializing] = useState(true); // For initial session/conversation setup
  const [leadCaptureStep, setLeadCaptureStep] = useState<LeadCaptureStep>('awaitingName');
  const [userName, setUserName] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationDbId, setConversationDbId] = useState<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize session and conversation
    let storedSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem(SESSION_ID_KEY, storedSessionId);
    }
    setSessionId(storedSessionId);

    const initializeConversation = async (sid: string, lang: Language) => {
      setIsInitializing(true);
      const result: GetOrCreateConversationResult = await getOrCreateConversation(sid, lang);
      if (result.id !== -1 && !result.error) {
        setConversationDbId(result.id);
        // Optionally load previous messages here if desired in future
        // const { messages: historicalMessages, error: historyError } = await getMessagesForConversation(result.id);
        // if (!historyError && historicalMessages.length > 0) {
        //   setMessages(historicalMessages);
        // } else {
        // Initial message based on lead capture step
        if (leadCaptureStep === 'awaitingName' && messages.length === 0) {
            const namePrompt = currentLanguage === 'en' ? LEAD_CAPTURE_NAME_PROMPT_EN : LEAD_CAPTURE_NAME_PROMPT_TE;
            // Use a local addMessage function that doesn't try to save to DB yet, as conversationDbId might not be set
            _addMessageToState({ id: 'leadNamePrompt', text: namePrompt, sender: 'bot', timestamp: new Date(), language: currentLanguage, conversationDbId: -1 });
          }
        // }
      } else {
        toast({
          title: 'Initialization Error',
          description: result.error || 'Could not initialize chat session. Please refresh.',
          variant: 'destructive',
        });
        // Disable chat input or show error message
      }
      setIsInitializing(false);
    };

    if (storedSessionId) {
      initializeConversation(storedSessionId, currentLanguage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Update initial/greeting message when language or lead capture step changes AFTER initialization
   useEffect(() => {
    if (isInitializing || !conversationDbId) return; // Don't run if still initializing or no conversation ID

    if (leadCaptureStep === 'awaitingName' && messages.length === 0) {
      const namePrompt = currentLanguage === 'en' ? LEAD_CAPTURE_NAME_PROMPT_EN : LEAD_CAPTURE_NAME_PROMPT_TE;
      addMessage(namePrompt, 'bot', false, undefined, true); // isInitialLeadPrompt = true
    } else if (leadCaptureStep === 'awaitingPhoneNumber' && messages.length > 0 && messages[messages.length-1].sender === 'user') {
      // This case is handled by handleSendMessage after name is submitted
    } else if (leadCaptureStep === 'completed' && (messages.length === 0 || (messages.length > 0 && messages[messages.length-1].sender === 'bot' && messages[messages.length-1].text.includes(LEAD_CAPTURE_THANKS_EN)))) {
      // Check if the last bot message was the "thanks" message after lead capture
      const greetingText = currentLanguage === 'en' ? GREETING_MESSAGE_EN : GREETING_MESSAGE_TE;
      addMessage(greetingText, 'bot', false, undefined, true); // isInitialLeadPrompt = true, but will not be saved if conversationDbId is null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, leadCaptureStep, isInitializing, conversationDbId, messages.length]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  }, [messages]);

  // Local function to add message to state without saving to DB initially.
  const _addMessageToState = (newMessage: Message) => {
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  const handleLanguageChange = (lang: Language) => {
    setCurrentLanguage(lang);
    setMessages([]); // Clear messages to re-trigger prompts/greetings in new language
    
    // Re-initialize conversation if needed or just update language preference.
    // For simplicity, we'll rely on the useEffect for leadCaptureStep/greeting to re-evaluate.
    // If conversationDbId exists, we might want to update its language preference on the backend.
    // For now, new messages will be logged with the new language.

    if (isInitializing || !conversationDbId) return;

    if (leadCaptureStep === 'awaitingName') {
      const namePrompt = lang === 'en' ? LEAD_CAPTURE_NAME_PROMPT_EN : LEAD_CAPTURE_NAME_PROMPT_TE;
      addMessage(namePrompt, 'bot', false, undefined, true);
    } else if (leadCaptureStep === 'awaitingPhoneNumber') {
       const phonePrompt = lang === 'en' ? LEAD_CAPTURE_PHONE_PROMPT_EN(userName) : LEAD_CAPTURE_PHONE_PROMPT_TE(userName);
       addMessage(phonePrompt, 'bot', false, undefined, true);
    } else if (leadCaptureStep === 'completed') {
        const greetingText = lang === 'en' ? GREETING_MESSAGE_EN : GREETING_MESSAGE_TE;
        addMessage(greetingText, 'bot', false, undefined, true);
    }
  };

  const addMessage = async (
    text: string,
    sender: 'user' | 'bot' | 'system',
    isEligibilityResult = false,
    eligibilityData?: {isEligible: boolean; details: string},
    isInitialLeadOrGreeting = false // Flag to prevent saving initial prompts if convId not ready
  ) => {
    if (!conversationDbId && !isInitialLeadOrGreeting && sender !== 'system') {
      // If it's not an initial prompt and we don't have a conversation ID, something is wrong.
      // Or, if it's a user message, they shouldn't be able to send if conv isn't ready.
      // For bot messages that are not initial prompts, we also need convDbId.
      toast({ title: "Error", description: "Conversation not ready. Cannot send/save message.", variant: "destructive" });
      console.error("Attempted to add message without conversationDbId:", {text, sender});
      // Potentially defer adding to UI state or show an error message on the message itself.
      // For now, we'll add to UI state but log error.
       _addMessageToState({
        id: Date.now().toString() + Math.random().toString(),
        text: text + " (Error: Not saved to DB)",
        sender,
        timestamp: new Date(),
        language: currentLanguage,
        isEligibilityResult,
        ...(isEligibilityResult && eligibilityData && { eligibility: eligibilityData }),
        conversationDbId: -1, // Indicate invalid conversation
      });
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(),
      text,
      sender,
      timestamp: new Date(),
      language: currentLanguage,
      isEligibilityResult,
      ...(isEligibilityResult && eligibilityData && { eligibility: eligibilityData }),
      conversationDbId: conversationDbId || -1, // Use -1 if null, though should be caught above
    };
    _addMessageToState(newMessage); // Add to UI first

    if (conversationDbId && sender !== 'system' && !isInitialLeadOrGreeting) { // Don't save system messages or initial prompts that were added before convId was ready
      const messageToSave = {
        conversationDbId: conversationDbId, // Ensure this is not null
        sender: newMessage.sender,
        text: newMessage.text,
        language: newMessage.language,
        isEligibilityResult: newMessage.isEligibilityResult,
        eligibility: newMessage.eligibility,
      };
      const saveResult: AddMessageResult = await addMessageToConversation(messageToSave);
      if (!saveResult.success) {
        console.error("Failed to save message to DB:", saveResult.error);
        toast({ title: "Message Not Saved", description: `Error: ${saveResult.error || 'Could not save message to server.'}`, variant: "destructive" });
        // Optionally update the message in state to indicate it wasn't saved
        setMessages(prev => prev.map(m => m.id === newMessage.id ? {...m, text: m.text + " (Send Error)"} : m));
      } else {
        // Optionally update message with dbId if needed
        // setMessages(prev => prev.map(m => m.id === newMessage.id ? {...m, dbId: saveResult.messageDbId } : m));
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!conversationDbId && leadCaptureStep === 'completed') { // Don't allow regular chat if conversation isn't ready
        toast({ title: "Chat Not Ready", description: "Please wait for the chat to initialize.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    addMessage(text, 'user'); // This will also attempt to save it via the updated addMessage
    setIsLoading(true);

    if (leadCaptureStep === 'awaitingName') {
      setUserName(text);
      setLeadCaptureStep('awaitingPhoneNumber');
      const phonePrompt = currentLanguage === 'en' ? LEAD_CAPTURE_PHONE_PROMPT_EN(text) : LEAD_CAPTURE_PHONE_PROMPT_TE(text);
      addMessage(phonePrompt, 'bot');
      setIsLoading(false);
      return;
    }

    if (leadCaptureStep === 'awaitingPhoneNumber') {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(text)) {
        const invalidPhoneMessage = currentLanguage === 'en' ? LEAD_CAPTURE_INVALID_PHONE_EN : LEAD_CAPTURE_INVALID_PHONE_TE;
        addMessage(invalidPhoneMessage, 'bot');
        setIsLoading(false);
        return;
      }

      // Pass conversationDbId to saveLead. It can be null if initialization failed.
      const { success, error, leadId } = await saveLead(userName, text, currentLanguage, conversationDbId);
      if (success && leadId) {
        const thanksMessage = currentLanguage === 'en' ? LEAD_CAPTURE_THANKS_EN : LEAD_CAPTURE_THANKS_TE;
        addMessage(thanksMessage, 'bot');
        setLeadCaptureStep('completed');
        
        // After successful lead capture, display the main greeting
        const greetingText = currentLanguage === 'en' ? GREETING_MESSAGE_EN : GREETING_MESSAGE_TE;
        addMessage(greetingText, 'bot'); // This will now also be saved
        toast({ title: currentLanguage === 'en' ? LEAD_CAPTURE_SAVE_SUCCESS_EN: LEAD_CAPTURE_SAVE_SUCCESS_TE });
      } else {
        const saveErrorMessage = currentLanguage === 'en' ? LEAD_CAPTURE_SAVE_ERROR_EN : LEAD_CAPTURE_SAVE_ERROR_TE;
        addMessage(error || saveErrorMessage, 'bot');
        const phonePrompt = currentLanguage === 'en' ? LEAD_CAPTURE_PHONE_PROMPT_EN(userName) : LEAD_CAPTURE_PHONE_PROMPT_TE(userName);
        addMessage(phonePrompt, 'bot');
        toast({ title: currentLanguage === 'en' ? "Error" : "లోపం", description: error || saveErrorMessage, variant: "destructive" });
      }
      setIsLoading(false);
      return;
    }

    // Regular chat flow
    try {
      const eligibilityOutput = await checkServiceEligibility({ location: text });
      const isActualEligibilityResponse =
          eligibilityOutput.details &&
          !eligibilityOutput.details.toLowerCase().includes("please provide your pin code or city") &&
          !eligibilityOutput.details.toLowerCase().includes("please provide a valid pin") &&
          !eligibilityOutput.details.toLowerCase().includes("please enter your pin code or city") &&
          !eligibilityOutput.details.toLowerCase().includes("to check service availability");

      if (isActualEligibilityResponse) {
        addMessage(eligibilityOutput.details, 'bot', true, eligibilityOutput); // Pass original details for display, but structured data is in eligibilityOutput
      } else {
        const faqContent = currentLanguage === 'en' ? FAQ_CONTENT_EN : FAQ_CONTENT_TE;
        const faqInput = { query: text, faq: faqContent };
        const faqResult = await answerFaq(faqInput);

        const unknownPhrases = currentLanguage === 'en' ? UNKNOWN_ANSWER_PHRASES_EN : UNKNOWN_ANSWER_PHRASES_TE;
        const isFaqAnswerUnknown = unknownPhrases.some(phrase =>
          faqResult.answer.toLowerCase().includes(phrase.toLowerCase())
        ) || faqResult.answer.trim().length < 10;

        if (!isFaqAnswerUnknown) {
          addMessage(faqResult.answer, 'bot');
        } else {
          const dynamicContentResult = await dynamicContentRetrieval({ query: text });
          const isDynamicContentUnhelpful = dynamicContentResult.response.length < 20 ||
                                            dynamicContentResult.response.toLowerCase().includes("can't find specific information") ||
                                            dynamicContentResult.response.toLowerCase().includes("could you please rephrase") ||
                                            dynamicContentResult.response.toLowerCase().includes("i do not have information");

          if (!isDynamicContentUnhelpful) {
            addMessage(dynamicContentResult.response, 'bot');
          } else {
            if (eligibilityOutput.details.toLowerCase().includes("please provide") ||
                eligibilityOutput.details.toLowerCase().includes("to check service")) {
              addMessage(eligibilityOutput.details, 'bot'); // This is the "guide user to provide location" message
            } else {
               const fallbackMsg = currentLanguage === 'en'
                  ? "I'm sorry, I couldn't find an answer for that. Can you try rephrasing or asking something else?"
                  : "క్షమించండి, దానికి నేను సమాధానం కనుగొనలేకపోయాను. మీరు దయచేసి మళ్ళీ చెప్పగలరా లేదా ఇంకేమైనా అడగగలరా?";
              addMessage(fallbackMsg, 'bot');
            }
          }
        }
      }
    } catch (error) {
      console.error('AI interaction error:', error);
      const errorMsg = currentLanguage === 'en' ? 'Sorry, I encountered an error. Please try again.' : 'క్షమించండి, నేను లోపం ఎదుర్కొన్నాను. దయచేసి మళ్ళీ ప్రయత్నించండి.';
      addMessage(errorMsg, 'bot');
      toast({
        title: currentLanguage === 'en' ? "Error" : "లోపం",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isCapturingLead = leadCaptureStep !== 'completed';
  const currentLeadCaptureField = isCapturingLead
    ? leadCaptureStep === 'awaitingName' ? 'name' : 'phone'
    : undefined;

  if (isInitializing) {
    return (
      <div className="flex flex-col h-full bg-card shadow-2xl rounded-lg overflow-hidden items-center justify-center">
        <Loader2 size={48} className="animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Initializing chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card shadow-2xl rounded-lg overflow-hidden">
      <header className="p-4 border-b border-border bg-primary text-primary-foreground">
        <h1 className="text-xl font-headline text-center">
          {currentLanguage === 'en' ? 'TeRA - T-Fiber Assistant' : 'TeRA - T-ఫైబర్ సహాయకురాలు'}
        </h1>
      </header>
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && ( // This loading is for AI responses or lead saving (not initial load)
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
        isSending={isLoading || !conversationDbId} // Also disable if conversation not ready
        isCapturingLead={isCapturingLead}
        leadCaptureField={currentLeadCaptureField}
      />
    </div>
  );
}
