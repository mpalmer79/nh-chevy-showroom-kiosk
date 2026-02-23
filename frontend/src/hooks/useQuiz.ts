import { useState, useCallback } from 'react';
import { QUIZ_QUESTIONS } from '../data/quizQuestions';
import type { QuizQuestion } from '../data/quizQuestions';

export type QuizAnswers = Record<string, string | string[]>;

interface UseQuizParams {
  onComplete?: (answers: QuizAnswers) => void;
  onShowLeaseHelp?: () => void;
}

interface UseQuizReturn {
  currentQuestion: number;
  question: QuizQuestion | undefined;
  answers: QuizAnswers;
  isAnimating: boolean;
  progress: number;
  isMultiSelect: boolean;
  isLastQuestion: boolean;
  isFirstQuestion: boolean;
  selectedOptions: (string | string[] | undefined)[] | string | string[];
  totalQuestions: number;
  handleAnswer: (value: string) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleLeaseDecision: (choice: string) => void;
  handleComplete: () => void;
  hasCurrentAnswer: () => boolean;
}

export const useQuiz = ({ onComplete, onShowLeaseHelp }: UseQuizParams): UseQuizReturn => {
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const questions: QuizQuestion[] = QUIZ_QUESTIONS;
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isMultiSelect = question?.multiSelect || false;
  const isLastQuestion = currentQuestion === questions.length - 1;
  const isFirstQuestion = currentQuestion === 0;

  const selectedOptions: (string | string[] | undefined)[] = isMultiSelect
    ? (Array.isArray(answers[question?.id]) ? answers[question?.id] as string[] : [])
    : [answers[question?.id]];

  const handleNext = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      onComplete?.(answers);
    }
  }, [currentQuestion, questions.length, answers, onComplete]);

  const handleAnswer = useCallback((value: string) => {
    const q = questions[currentQuestion];

    if (q.multiSelect) {
      const currentSelections = (answers[q.id] as string[]) || [];
      let newSelections: string[];

      if (currentSelections.includes(value)) {
        newSelections = currentSelections.filter((v: string) => v !== value);
      } else if (currentSelections.length < (q.maxSelections || Infinity)) {
        newSelections = [...currentSelections, value];
      } else {
        return;
      }

      setAnswers(prev => ({ ...prev, [q.id]: newSelections }));
    } else {
      setAnswers(prev => ({ ...prev, [q.id]: value }));

      if (q.id === 'paymentType' && value === 'unsure') {
        onShowLeaseHelp?.();
        return;
      }

      setTimeout(() => handleNext(), 300);
    }
  }, [currentQuestion, answers, questions, onShowLeaseHelp, handleNext]);

  const handlePrevious = useCallback(() => {
    if (currentQuestion > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestion(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [currentQuestion]);

  const handleLeaseDecision = useCallback((choice: string) => {
    setAnswers(prev => ({ ...prev, paymentType: choice }));
    setTimeout(() => handleNext(), 300);
  }, [handleNext]);

  const handleComplete = useCallback(() => {
    onComplete?.(answers);
  }, [answers, onComplete]);

  const hasCurrentAnswer = useCallback((): boolean => {
    const answer = answers[question?.id];
    if (isMultiSelect) {
      return Array.isArray(answer) && answer.length > 0;
    }
    return answer !== undefined;
  }, [answers, question, isMultiSelect]);

  return {
    currentQuestion,
    question,
    answers,
    isAnimating,
    progress,
    isMultiSelect,
    isLastQuestion,
    isFirstQuestion,
    selectedOptions,
    totalQuestions: questions.length,

    handleAnswer,
    handleNext,
    handlePrevious,
    handleLeaseDecision,
    handleComplete,
    hasCurrentAnswer,
  };
};

export default useQuiz;
