"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ApiKeyModalProps {
	isOpen: boolean;
	onClose: (apiKey?: string) => void;
	error?: string | null;
}

export function ApiKeyModal({ isOpen, onClose, error }: ApiKeyModalProps) {
	const [apiKey, setApiKey] = useState("");
	const [inputError, setInputError] = useState<string | null>(null);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!apiKey.trim()) {
			setInputError("Please enter a valid API key");
			return;
		}

		// Save to localStorage and close modal
		localStorage.setItem("worldNewsApiKey", apiKey.trim());
		onClose(apiKey.trim());
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Enter your World News API Key</DialogTitle>
					<DialogDescription>
						To use this application, you need a World News API key. You can get one for free at{" "}
						<a href="https://worldnewsapi.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
							worldnewsapi.com
						</a>
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{(error || inputError) && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error || inputError}</AlertDescription>
						</Alert>
					)}

					<div className="space-y-2">
						<Label htmlFor="apiKey">API Key</Label>
						<Input
							id="apiKey"
							value={apiKey}
							onChange={(e) => {
								setApiKey(e.target.value);
								setInputError(null);
							}}
							placeholder="Enter your World News API key"
							className="w-full"
							autoFocus
						/>
					</div>

					<DialogFooter>
						<Button type="submit" className="w-full">
							Save API Key
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
