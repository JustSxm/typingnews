"use client";

import type React from "react";

import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Play, CornerDownLeft } from "lucide-react";
import KeyboardVisualizer from "./keyboard-visualizer";
import { motion } from "framer-motion";

interface TypingTestProps {
	text: string;
}

// Define state type
interface TypingState {
	input: string;
	currentIndex: number;
	errors: number;
	currentError: boolean;
	startTime: number | null;
	endTime: number | null;
	isFinished: boolean;
	lastPressedKey: string | null;
}

// Define action types
type TypingAction = { type: "CORRECT_KEY"; char: string; key: string } | { type: "INCORRECT_KEY"; key: string } | { type: "RESET" } | { type: "FINISH" };

// Reducer function to handle all state updates in one place
function typingReducer(state: TypingState, action: TypingAction): TypingState {
	switch (action.type) {
		case "CORRECT_KEY":
			const newIndex = state.currentIndex + 1;
			const newIsFinished = newIndex >= text.length;

			return {
				...state,
				input: state.input + action.char,
				currentIndex: newIndex,
				currentError: false,
				startTime: state.startTime || Date.now(),
				endTime: newIsFinished ? Date.now() : state.endTime,
				isFinished: newIsFinished,
				lastPressedKey: action.key,
			};

		case "INCORRECT_KEY":
			return {
				...state,
				errors: state.errors + 1,
				currentError: true,
				startTime: state.startTime || Date.now(),
				lastPressedKey: action.key,
			};

		case "FINISH":
			return {
				...state,
				endTime: Date.now(),
				isFinished: true,
			};

		case "RESET":
			return {
				input: "",
				currentIndex: 0,
				errors: 0,
				currentError: false,
				startTime: null,
				endTime: null,
				isFinished: false,
				lastPressedKey: null,
			};

		default:
			return state;
	}
}

// Global text variable to avoid passing it to the reducer
let text = "";

export default function TypingTest({ text: propText }: TypingTestProps) {
	// Set the global text variable
	text = propText;

	const inputRef = useRef<HTMLTextAreaElement>(null);
	const textDisplayRef = useRef<HTMLDivElement>(null);
	const currentCharRef = useRef<HTMLSpanElement>(null);
	const scrollAnimationRef = useRef<number | null>(null);
	// Animation key to force re-render of animations
	const [animationKey, setAnimationKey] = useState(0);

	// Use reducer instead of multiple useState calls
	const [state, dispatch] = useReducer(typingReducer, {
		input: "",
		currentIndex: 0,
		errors: 0,
		currentError: false,
		startTime: null,
		endTime: null,
		isFinished: false,
		lastPressedKey: null,
	});

	// Extract state variables for easier access
	const { input, currentIndex, errors, currentError, startTime, endTime, isFinished, lastPressedKey } = state;

	// For metrics that don't need to update on every render
	const [metrics, setMetrics] = useState({ wpm: 0, accuracy: 100 });

	// Update metrics less frequently
	useEffect(() => {
		const intervalId = setInterval(() => {
			if (startTime) {
				const wpm = calculateWPM();
				const accuracy = calculateAccuracy();
				setMetrics({ wpm, accuracy });
			}
		}, 500); // Update every 500ms instead of every render

		return () => clearInterval(intervalId);
	}, [startTime, currentIndex, errors]);

	// Normalize quotes function
	const normalizeQuotes = useCallback((char: string): string => {
		// Convert all types of single quotes to standard straight single quote
		if (["'", "'", "'", "‛", "′", "‹", "›"].includes(char)) {
			return "'";
		}
		// Convert all types of double quotes to standard straight double quote
		if (['"', '"', "„", "‟", "″", "«", "»"].includes(char)) {
			return '"';
		}
		return char;
	}, []);

	// Handle key press
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			// Ignore modifier keys
			if (e.ctrlKey || e.altKey || e.metaKey) return;

			// Reset animation key to trigger animation
			setAnimationKey((prev) => prev + 1);

			// Handle backspace - only show animation but don't allow going back
			if (e.key === "Backspace") {
				// We still set lastPressedKey for visual feedback in the keyboard
				// but we don't actually change the state or allow going back
				state.lastPressedKey = "Backspace";
				e.preventDefault();
				return;
			}

			// Handle Enter key for newlines
			if (e.key === "Enter") {
				const expectedChar = text[currentIndex];
				if (expectedChar === "\n") {
					dispatch({ type: "CORRECT_KEY", char: "\n", key: "Enter" });
				} else {
					dispatch({ type: "INCORRECT_KEY", key: "Enter" });
				}
				e.preventDefault();
				return;
			}

			// Ignore keys that aren't single characters
			if (e.key.length !== 1) return;

			// Check if the typed character matches the expected character
			const expectedChar = text[currentIndex];
			const normalizedTyped = normalizeQuotes(e.key);
			const normalizedExpected = normalizeQuotes(expectedChar);

			if (normalizedTyped === normalizedExpected) {
				// Correct input
				dispatch({ type: "CORRECT_KEY", char: normalizedExpected, key: e.key });
			} else {
				// Incorrect input
				dispatch({ type: "INCORRECT_KEY", key: e.key });
			}

			// Prevent default to avoid adding characters to textarea
			e.preventDefault();
		},
		[currentIndex, normalizeQuotes, state]
	);

	// Reset the test
	const resetTest = useCallback(() => {
		dispatch({ type: "RESET" });
		if (inputRef.current) {
			inputRef.current.focus();
		}
		// Reset scroll position
		if (textDisplayRef.current) {
			textDisplayRef.current.scrollTop = 0;
		}
		// Cancel any ongoing scroll animation
		if (scrollAnimationRef.current !== null) {
			cancelAnimationFrame(scrollAnimationRef.current);
			scrollAnimationRef.current = null;
		}
	}, []);

	// Calculate WPM (Words Per Minute)
	const calculateWPM = useCallback(() => {
		if (!startTime) return 0;

		const endTimeValue = endTime || Date.now();
		const timeInMinutes = (endTimeValue - startTime) / 60000;
		// Standard: 5 characters = 1 word
		const wordCount = currentIndex / 5;

		// Ensure we don't divide by zero
		return timeInMinutes > 0 ? Math.round(wordCount / timeInMinutes) : 0;
	}, [startTime, endTime, currentIndex]);

	// Calculate accuracy
	const calculateAccuracy = useCallback(() => {
		if (currentIndex === 0) return 100;
		// Calculate accuracy but ensure it doesn't go below 0%
		return Math.max(0, Math.round(((currentIndex - errors) / currentIndex) * 100));
	}, [currentIndex, errors]);

	// Calculate progress percentage
	const calculateProgress = useCallback(() => {
		return (currentIndex / text.length) * 100;
	}, [currentIndex, text]);

	// Auto-focus input on mount
	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, []);

	// Reset test when text changes
	useEffect(() => {
		resetTest();
	}, [propText, resetTest]);

	// Get the current character to type
	const currentChar = useMemo(() => {
		return text[currentIndex] || "";
	}, [currentIndex]);

	// Render the text with proper styling
	const renderedText = useMemo(() => {
		const lines: React.ReactNode[][] = [[]];
		let currentLineIndex = 0;

		// Process the entire text
		for (let i = 0; i < text.length; i++) {
			// Handle newline characters
			if (text[i] === "\n") {
				// Add the newline indicator to the current line
				if (i === currentIndex) {
					// Current newline character with animation
					lines[currentLineIndex].push(
						<motion.span
							key={i}
							ref={i === currentIndex ? currentCharRef : null}
							initial={{ opacity: 0.7 }}
							animate={{
								opacity: [0.7, 1, 0.7],
								backgroundColor: currentError
									? ["rgba(254, 202, 202, 0.7)", "rgba(254, 202, 202, 1)", "rgba(254, 202, 202, 0.7)"]
									: ["rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.1)"],
							}}
							transition={{
								repeat: Number.POSITIVE_INFINITY,
								duration: 1.5,
								ease: "easeInOut",
							}}
							className={`inline-flex items-center ${currentError ? "text-red-500" : ""}`}
						>
							<CornerDownLeft className="h-4 w-4 mx-1" />
						</motion.span>
					);
				} else if (i < currentIndex) {
					// Completed newline
					lines[currentLineIndex].push(
						<span key={i} className="text-green-500 inline-flex items-center">
							<CornerDownLeft className="h-4 w-4 mx-1" />
						</span>
					);
				} else {
					// Future newline
					lines[currentLineIndex].push(
						<span key={i} className="inline-flex items-center">
							<CornerDownLeft className="h-4 w-4 mx-1" />
						</span>
					);
				}

				// Start a new line
				currentLineIndex++;
				lines[currentLineIndex] = [];
				continue;
			}

			// Handle regular characters
			let className = "";

			if (i < currentIndex) {
				className = "text-green-500";
			} else if (i === currentIndex) {
				// Use a different approach for the current character to allow for animation
				lines[currentLineIndex].push(
					<motion.span
						key={i}
						ref={currentCharRef}
						initial={{ opacity: 0.7 }}
						animate={{
							opacity: [0.7, 1, 0.7],
							backgroundColor: currentError
								? ["rgba(254, 202, 202, 0.7)", "rgba(254, 202, 202, 1)", "rgba(254, 202, 202, 0.7)"]
								: ["rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.1)"],
						}}
						transition={{
							repeat: Number.POSITIVE_INFINITY,
							duration: 1.5,
							ease: "easeInOut",
						}}
						className={currentError ? "text-red-500" : ""}
					>
						{text[i]}
					</motion.span>
				);
				continue;
			}

			lines[currentLineIndex].push(
				<span key={i} className={className}>
					{text[i]}
				</span>
			);
		}

		// Render each line with proper line breaks
		return lines.map((line, index) => (
			<div key={`line-${index}`} className="min-h-[1.5em]">
				{line}
			</div>
		));
	}, [currentIndex, currentError, text]);

	// Implement smooth scrolling to keep current character centered
	useEffect(() => {
		// Cancel any ongoing animation
		if (scrollAnimationRef.current !== null) {
			cancelAnimationFrame(scrollAnimationRef.current);
			scrollAnimationRef.current = null;
		}

		if (!textDisplayRef.current || !currentCharRef.current) return;

		const textDisplay = textDisplayRef.current;
		const currentChar = currentCharRef.current;

		// Get the positions and dimensions
		const displayRect = textDisplay.getBoundingClientRect();
		const charRect = currentChar.getBoundingClientRect();

		// Calculate the ideal scroll position to center the current character
		const charRelativeTop = charRect.top - displayRect.top;
		const charRelativeBottom = charRect.bottom - displayRect.top;

		// The middle of the display area
		const displayMiddle = displayRect.height / 2;

		// Calculate how much we need to scroll to center the character
		const charMiddle = (charRelativeTop + charRelativeBottom) / 2;
		const scrollAdjustment = charMiddle - displayMiddle;

		// Only scroll if the character is significantly off-center
		// Use a smaller threshold to ensure scrolling happens
		const threshold = 10; // 10 pixels threshold

		if (Math.abs(scrollAdjustment) < threshold) {
			// Character is close enough to center, don't scroll
			return;
		}

		// Apply the scroll adjustment gradually
		const currentScroll = textDisplay.scrollTop;
		const targetScroll = currentScroll + scrollAdjustment;

		// Implement a custom smooth scrolling with animation frames
		let startTime: number | null = null;
		const duration = 300; // ms

		const animateScroll = (timestamp: number) => {
			if (!startTime) startTime = timestamp;
			const elapsed = timestamp - startTime;

			// Calculate progress (0 to 1)
			const progress = Math.min(elapsed / duration, 1);

			// Apply easing function for smoother motion
			const easedProgress = easeInOutCubic(progress);

			// Calculate the new scroll position
			const newScrollTop = currentScroll + scrollAdjustment * easedProgress;

			// Apply the scroll
			if (textDisplayRef.current) {
				textDisplayRef.current.scrollTop = newScrollTop;
			}

			// Continue animation if not complete
			if (progress < 1) {
				scrollAnimationRef.current = requestAnimationFrame(animateScroll);
			} else {
				scrollAnimationRef.current = null;
			}
		};

		// Start the animation
		scrollAnimationRef.current = requestAnimationFrame(animateScroll);

		// Cleanup function to cancel animation if component unmounts
		return () => {
			if (scrollAnimationRef.current !== null) {
				cancelAnimationFrame(scrollAnimationRef.current);
			}
		};
	}, [currentIndex]);

	// Easing function for smoother scrolling
	const easeInOutCubic = (t: number): number => {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	};

	return (
		<div className="grid grid-cols-1 gap-3">
			{/* Text display and input in the first row */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{/* Text display */}
				<div ref={textDisplayRef} className="relative bg-muted p-3 rounded-md h-80 overflow-y-auto text-display">
					<div className="text-base leading-relaxed font-mono">{renderedText}</div>
				</div>

				{/* Input area */}
				<div className="flex flex-col">
					<textarea
						ref={inputRef}
						value={input}
						onKeyDown={handleKeyDown}
						disabled={isFinished}
						className="w-full h-80 p-3 border rounded-md font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
						placeholder="Start typing here..."
						readOnly
					/>
				</div>
			</div>

			{/* Stats and progress in the second row */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
				{/* Stats */}
				<div className="flex justify-center md:justify-start gap-4">
					<div className="text-center">
						<p className="text-xs text-muted-foreground">WPM</p>
						<p className="text-xl font-bold">{startTime ? metrics.wpm : "--"}</p>
					</div>
					<div className="text-center">
						<p className="text-xs text-muted-foreground">Accuracy</p>
						<p className="text-xl font-bold">{metrics.accuracy}%</p>
					</div>
				</div>

				{/* Progress bar */}
				<div className="space-y-1">
					<div className="flex justify-between text-xs">
						<span>Progress</span>
						<span>{Math.round(calculateProgress())}%</span>
					</div>
					<Progress value={calculateProgress()} className="h-2" />
				</div>

				{/* Reset button */}
				<div className="flex justify-center md:justify-end">
					<Button onClick={resetTest} variant="outline" size="sm" className="gap-2">
						<RefreshCw className="h-4 w-4" />
						Reset
					</Button>
				</div>
			</div>

			{/* Keyboard visualizer in the third row */}
			<div className="mt-20">
				<KeyboardVisualizer currentChar={currentChar} isError={currentError} pressedKey={lastPressedKey} animationKey={animationKey} />
			</div>

			{/* Completion message */}
			{isFinished && (
				<div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 rounded-md mt-2">
					<h3 className="font-bold text-lg mb-1">Test Complete!</h3>
					<p>
						You typed at <span className="font-bold">{metrics.wpm} WPM</span> with <span className="font-bold">{metrics.accuracy}%</span> accuracy.
					</p>
					<Button onClick={resetTest} className="mt-2 gap-2">
						<Play className="h-4 w-4" />
						Try Again
					</Button>
				</div>
			)}
		</div>
	);
}
