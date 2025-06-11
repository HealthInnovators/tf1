'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Mic, Loader2, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Assuming 'Language' is a type defined elsewhere, e.g., export type Language = 'en' | 'te';
type Language = 'en' | 'te';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  isSending: boolean;
  isCapturingLead: boolean;
  isRecording: boolean;
  setIsRecording: (newState: boolean) => void;
  leadCaptureField?: string;
}

export default function ChatInput({
  onSendMessage,
  currentLanguage,
  onLanguageChange,
  isSending,
  isCapturingLead,
  isRecording,
  setIsRecording,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Effect 1: Manages the CREATION and CLEANUP of the SpeechRecognition instance.
  // It only re-runs if the language changes.
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('Not in browser environment');
      return;
    }

    // Check if SpeechRecognition is supported
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      toast({
        title: 'Voice Recognition Not Supported',
        description: 'Your browser does not support voice recognition.',
        variant: 'destructive',
      });
      return;
    }

    // Initialize SpeechRecognition only if it's not already initialized
    if (!recognitionRef.current) {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = false;
      recognition.interimResults = false;

      // Set up event handlers
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          onSendMessage(transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        let errorMsg = 'An unknown voice recognition error occurred.';
        switch (event.error) {
          case 'no-speech':
            errorMsg = 'No speech was detected. Please try again.';
            break;
          case 'audio-capture':
            errorMsg = 'Microphone not available. Please check your microphone connection and settings.';
            break;
          case 'not-allowed':
            errorMsg = 'Microphone access denied. Please allow microphone access in browser settings.';
            break;
          case 'aborted':
            errorMsg = 'Voice recognition was aborted.';
            break;
          case 'network':
            errorMsg = 'Network error occurred during voice recognition.';
            break;
          case 'bad-grammar':
            errorMsg = 'Invalid grammar for voice recognition.';
            break;
          case 'language-not-supported':
            errorMsg = 'Selected language is not supported for voice recognition.';
            break;
          default:
            errorMsg = `Error: ${event.error}`;
        }
        
        toast({
          title: 'Voice Recognition Error',
          description: errorMsg,
          variant: 'destructive',
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
    }

    // Update language only when it changes
    if (recognitionRef.current) {
      recognitionRef.current.lang = currentLanguage === 'en' ? 'en-US' : 'te-IN';
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [currentLanguage, onSendMessage, setIsRecording, toast]);

  // Effect 2: Manages STARTING and STOPPING the recognition.
  // This reacts only to the `isRecording` state.
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isRecording) {
      // Check if it's not already active before starting
      if (recognition.state === 'inactive') {
        try {
          recognition.start();
        } catch (e) {
          console.error("Error starting recognition in effect:", e);
          toast({
            title: 'Could Not Start Recording',
            description: 'There was an issue activating the microphone.',
            variant: 'destructive',
          });
          setIsRecording(false); // Reset state on error
          return; // Exit early to prevent further execution
        }
      }
    } else {
      // Check if it's active before stopping
      if (recognition.state !== 'inactive') {
        try {
          recognition.stop();
        } catch (e) {
          console.error("Error stopping recognition:", e);
          toast({
            title: 'Could Not Stop Recording',
            description: 'There was an issue stopping the microphone.',
            variant: 'destructive',
          });
        }
      }
    }
    // No setIsRecording in dependency array to prevent potential loops if onend also calls it.
    // The onend handler is the source of truth for the final state.
  }, [isRecording, toast]);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isSending) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleLanguageToggle = () => {
    onLanguageChange(currentLanguage === 'en' ? 'te' : 'en');
  };

  const handleMicClick = () => {
    if (isCapturingLead || isSending) return;

    if (!recognitionRef.current) {
      toast({
        title: 'Voice Recognition Not Available',
        description: 'Your browser may not support this feature.',
        variant: 'destructive',
      });
      return;
    }

    // The only job of the click handler is to toggle the state.
    // The useEffect hooks will handle the rest.
    setIsRecording(!isRecording);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 left-0 right-0 z-10 flex items-center gap-2 p-4 bg-background border-t border-border shadow-md"
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleLanguageToggle}
              aria-label={currentLanguage === 'en' ? 'Switch to Telugu' : 'Switch to English'}
              disabled={isSending || isRecording}
            >
              {/* Using text for language indicator */}
              <span className="text-xl font-semibold">{currentLanguage === 'en' ? 'తె' : 'EN'}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Switch to {currentLanguage === 'en' ? 'Telugu' : 'English'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Type a message or use the mic..."
        className="flex-grow font-body"
        disabled={isSending || isRecording}
        aria-label="Chat message input"
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={handleMicClick}
              disabled={isSending || isCapturingLead}
              aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isRecording ? 'Stop voice input' : 'Start voice input'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button type="submit" size="icon" disabled={isSending || isRecording || !inputValue.trim()} aria-label="Send message">
        {isSending ? <Loader2 size={20} className="animate-spin" /> : <SendHorizontal size={20} />}
      </Button>
    </form>
  );
}