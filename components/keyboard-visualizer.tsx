"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CornerDownLeft } from "lucide-react";

interface KeyboardVisualizerProps {
	currentChar: string;
	isError: boolean;
	pressedKey: string | null;
	animationKey?: number;
}

export default function KeyboardVisualizer({ currentChar, isError, pressedKey, animationKey = 0 }: KeyboardVisualizerProps) {
	// Define the QWERTY keyboard layout
	const keyboardLayout = [
		["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
		["a", "s", "d", "f", "g", "h", "j", "k", "l"],
		["z", "x", "c", "v", "b", "n", "m"],
	];

	// Normalize the current character to lowercase for matching
	const normalizedCurrentChar = useMemo(() => {
		return currentChar.toLowerCase();
	}, [currentChar]);

	// Normalize the pressed key to lowercase for matching
	const normalizedPressedKey = useMemo(() => {
		return pressedKey ? pressedKey.toLowerCase() : null;
	}, [pressedKey]);

	// Check if the current character is a newline
	const isNewline = useMemo(() => {
		return currentChar === "\n";
	}, [currentChar]);

	// Function to determine key state and apply appropriate styling
	const getKeyStyle = (key: string) => {
		// Base styles
		let className = "flex items-center justify-center h-12 sm:h-14 rounded-md border border-gray-300 dark:border-gray-700 font-medium text-xs sm:text-sm";

		// Default key size
		let width = "w-16 sm:w-18";

		// Special keys
		if (key === "space") {
			width = "w-48 sm:w-96";
			className += " mx-1";
		} else if (key === "shift" || key === "enter") {
			width = "w-32 sm:w-28";
		} else if (key === "backspace") {
			width = "w-32 sm:w-28";
		}

		// Key state styling
		if (normalizedCurrentChar === key || (key === "space" && normalizedCurrentChar === " ") || (key === "enter" && isNewline)) {
			// Highlight the target key
			className += " bg-primary text-primary-foreground border-primary";
		} else if (key == keyboardLayout.flat().find((k) => k === normalizedPressedKey)) {
			// Previous letter was pressed
			// make it greyed out
			className += " bg-secondary dark:bg-secondary/60 text-secondary-foreground border-secondary";
		} else if (normalizedPressedKey === key && normalizedPressedKey !== normalizedCurrentChar) {
			// Wrong key pressed
			className += " bg-red-100 text-red-600 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700";
		} else {
			// Default state
			className += " bg-secondary text-secondary-foreground";
		}

		return `${className} ${width}`;
	};

	// Determine if a key is currently pressed
	const isKeyPressed = (key: string) => {
		return (
			normalizedPressedKey === key ||
			(key === "space" && normalizedPressedKey === " ") ||
			(key === "backspace" && normalizedPressedKey === "backspace") ||
			(key === "enter" && normalizedPressedKey === "enter")
		);
	};

	// Animation variants for key press
	const keyVariants = {
		pressed: {
			scale: 0.9,
			y: 2,
			boxShadow: "0 1px 0 rgba(0, 0, 0, 0.1)",
			transition: { duration: 0.1 },
		},
		released: {
			scale: 1,
			y: 0,
			boxShadow: "0 2px 0 rgba(0, 0, 0, 0.1)",
			transition: {
				duration: 0.2,
				type: "spring",
				stiffness: 500,
				damping: 15,
			},
		},
	};

	return (
		<div className="keyboard-visualizer select-none">
			<div className="flex flex-col items-center gap-1">
				{/* First row */}
				<div className="flex gap-1">
					{keyboardLayout[0].map((key) => (
						<motion.div
							key={`${key}-${animationKey}`}
							className={getKeyStyle(key)}
							initial="released"
							animate={isKeyPressed(key) ? "pressed" : "released"}
							variants={keyVariants}
							style={{ boxShadow: "0 2px 0 rgba(0, 0, 0, 0.1)" }}
						>
							{key.toUpperCase()}
						</motion.div>
					))}
					<motion.div
						key={`backspace-${animationKey}`}
						className={getKeyStyle("backspace")}
						initial="released"
						animate={isKeyPressed("backspace") ? "pressed" : "released"}
						variants={keyVariants}
						style={{ boxShadow: "0 2px 0 rgba(0, 0, 0, 0.1)" }}
					>
						⌫
					</motion.div>
				</div>

				{/* Second row */}
				<div className="flex gap-1">
					<div className="w-3 sm:w-4"></div> {/* Offset for the second row */}
					{keyboardLayout[1].map((key) => (
						<motion.div
							key={`${key}-${animationKey}`}
							className={getKeyStyle(key)}
							initial="released"
							animate={isKeyPressed(key) ? "pressed" : "released"}
							variants={keyVariants}
							style={{ boxShadow: "0 2px 0 rgba(0, 0, 0, 0.1)" }}
						>
							{key.toUpperCase()}
						</motion.div>
					))}
				</div>

				{/* Third row */}
				<div className="flex gap-1">
					<motion.div
						key={`shift-${animationKey}`}
						className={getKeyStyle("shift")}
						initial="released"
						animate={isKeyPressed("shift") ? "pressed" : "released"}
						variants={keyVariants}
						style={{ boxShadow: "0 2px 0 rgba(0, 0, 0, 0.1)" }}
					>
						Shift
					</motion.div>
					{keyboardLayout[2].map((key) => (
						<motion.div
							key={`${key}-${animationKey}`}
							className={getKeyStyle(key)}
							initial="released"
							animate={isKeyPressed(key) ? "pressed" : "released"}
							variants={keyVariants}
							style={{ boxShadow: "0 2px 0 rgba(0, 0, 0, 0.1)" }}
						>
							{key.toUpperCase()}
						</motion.div>
					))}
					<motion.div
						key={`enter-${animationKey}`}
						className={getKeyStyle("enter")}
						initial="released"
						animate={isKeyPressed("enter") ? "pressed" : "released"}
						variants={keyVariants}
						style={{ boxShadow: "0 2px 0 rgba(0, 0, 0, 0.1)" }}
					>
						<CornerDownLeft className="h-3 w-3 sm:h-4 sm:w-4" />
					</motion.div>
				</div>

				{/* Fourth row - Space bar */}
				<div className="flex gap-1">
					<motion.div
						key={`space-${animationKey}`}
						className={getKeyStyle("space")}
						initial="released"
						animate={isKeyPressed("space") ? "pressed" : "released"}
						variants={keyVariants}
						style={{ boxShadow: "0 2px 0 rgba(0, 0, 0, 0.1)" }}
					>
						Space
					</motion.div>
				</div>
			</div>
		</div>
	);
}
