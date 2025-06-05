
'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Mic, Languages, Loader2, MicOff } from 'lucide-react';
import type { Language } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast";
import { LEAD_CAPTURE_NAME_PLACEHOLDER_EN, LEAD_CAPTURE_NAME_PLACEHOLDER_TE, LEAD_CAPTURE_PHONE_PLACEHOLDER_EN, LEAD_CAPTURE_PHONE_PLACEHOLDER_TE } from '@/lib/constants';


interface ChatInputProps {
  onSendMessage: (text: string) => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  isSending: boolean;
  isCapturingLead: boolean;
  leadCaptureField?: 'name' | 'phone'; // New prop
}

export default function ChatInput({
  onSendMessage,
  currentLanguage,
  onLanguageChange,
  isSending,
  isCapturingLead,
  leadCaptureField, // New prop
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();
  const [inputPlaceholder, setInputPlaceholder] = useState('');

  useEffect(() => {
    if (isCapturingLead) {
      if (leadCaptureField === 'name') {
        setInputPlaceholder(currentLanguage === 'en' ? LEAD_CAPTURE_NAME_PLACEHOLDER_EN : LEAD_CAPTURE_NAME_PLACEHOLDER_TE);
      } else if (leadCaptureField === 'phone') {
        setInputPlaceholder(currentLanguage === 'en' ? LEAD_CAPTURE_PHONE_PLACEHOLDER_EN : LEAD_CAPTURE_PHONE_PLACEHOLDER_TE);
      } else {
        setInputPlaceholder(currentLanguage === 'en' ? "Please enter your details..." : "దయచేసి మీ వివరాలను నమోదు చేయండి...");
      }
    } else {
      setInputPlaceholder(currentLanguage === 'en' ? 'Type your message or use mic...' : 'మీ సందేశాన్ని టైప్ చేయండి లేదా మైక్ ఉపయోగించండి...');
    }
  }, [currentLanguage, isCapturingLead, leadCaptureField]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const instance = new SpeechRecognitionAPI();
        instance.continuous = false;
        instance.interimResults = false;

        instance.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputValue((prev) => (prev ? prev.trim() + ' ' : '') + transcript);
        };

        instance.onerror = (event) => {
          let errorMsg = 'An unknown voice recognition error occurred.';
          if (event.error === 'no-speech') {
            errorMsg = 'No speech was detected. Please try again.';
          } else if (event.error === 'audio-capture') {
            errorMsg = 'Microphone not available. Check browser/system settings.';
          } else if (event.error === 'not-allowed') {
            errorMsg = 'Microphone access denied. Please allow microphone access in browser settings.';
          } else {
            errorMsg = `Error: ${event.error}`;
          }
          toast({
            title: 'Voice Recognition Error',
            description: errorMsg,
            variant: 'destructive',
          });
          setIsRecording(false);
        };

        instance.onend = () => {
          setIsRecording(false);
        };
        recognitionRef.current = instance;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [toast]);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isSending) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleLanguageToggle = () => {
    if (!isCapturingLead) { // Disable during lead capture
      onLanguageChange(currentLanguage === 'en' ? 'te' : 'en');
    }
  };

  const handleMicClick = () => {
    if (isCapturingLead) return; // Disable during lead capture

    if (!recognitionRef.current) {
      toast({
        title: 'Unsupported Feature',
        description: 'Voice recognition is not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = currentLanguage === 'en' ? 'en-US' : 'te-IN';
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Error starting speech recognition:", e);
        toast({
            title: 'Voice Recognition Error',
            description: 'Could not start voice recognition. Please ensure microphone permission is granted.',
            variant: 'destructive',
          });
        setIsRecording(false);
      }
    }
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
              disabled={isSending || isRecording || isCapturingLead} // Disabled during lead capture
            >
              <Languages size={20} />
              <span className="sr-only">{currentLanguage === 'en' ? 'తెలుగు' : 'English'}</span>
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
        placeholder={inputPlaceholder}
        className="flex-grow font-body"
        disabled={isSending || isRecording} // Input field itself is not disabled by isCapturingLead
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
              disabled={isSending || isCapturingLead} // Disabled during lead capture
              aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isRecording ? 'Stop voice input' : 'Start voice input (Beta)'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button type="submit" size="icon" disabled={isSending || isRecording || !inputValue.trim()} aria-label="Send message">
        {isSending ? <Loader2 size={20} className="animate-spin" /> : <SendHorizontal size={20} />}
      </Button>
    </form>
  );
}
