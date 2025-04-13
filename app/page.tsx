"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TypingTest from "@/components/typing-test";
import StreakCounter from "@/components/streak-counter";
import { Loader2, AlertCircle, Key } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NewsProvider, useNews, categories } from "@/context/news-context";

// Import the new components
import { ThemeToggle } from "@/components/theme-toggle";
import { CountrySelector } from "@/components/country-selector";

// Streak counter component with localStorage persistence
function TypingNewsApp() {
	const {
		articlesByCategory,
		currentArticleIndex,
		loading,
		error,
		category,
		country,
		quota,
		articleSource,
		articleTitle,
		apiKey,
		setCategory,
		setCountry,
		getNextArticle,
		refreshArticles,
		resetApiKey,
	} = useNews();

	const [streak, setStreak] = useState(0);
	const [lastVisit, setLastVisit] = useState<string | null>(null);
	const [streakUpdated, setStreakUpdated] = useState(false);

	// Load streak data from localStorage
	useEffect(() => {
		const storedStreak = localStorage.getItem("typingStreak");
		const storedLastVisit = localStorage.getItem("lastVisitDate");

		if (storedStreak) {
			setStreak(Number.parseInt(storedStreak, 10));
		}

		if (storedLastVisit) {
			setLastVisit(storedLastVisit);
		}

		// Check if we need to update the streak
		const today = new Date().toISOString().split("T")[0];

		if (storedLastVisit) {
			const lastVisitDate = new Date(storedLastVisit);
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayString = yesterday.toISOString().split("T")[0];

			if (storedLastVisit === today) {
				// Already visited today, streak remains the same
			} else if (storedLastVisit === yesterdayString) {
				// Visited yesterday, increment streak
				const newStreak = storedStreak ? Number.parseInt(storedStreak, 10) + 1 : 1;
				setStreak(newStreak);
				localStorage.setItem("typingStreak", newStreak.toString());
				setStreakUpdated(true);
			} else {
				// Streak broken
				setStreak(1);
				localStorage.setItem("typingStreak", "1");
				setStreakUpdated(true);
			}
		} else {
			// First visit
			setStreak(1);
			localStorage.setItem("typingStreak", "1");
			setStreakUpdated(true);
		}

		// Update last visit date
		localStorage.setItem("lastVisitDate", today);
		setLastVisit(today);
	}, []);

	// Handle category change
	const handleCategoryChange = (value: string) => {
		setCategory(value);
	};

	// Handle country change
	const handleCountryChange = (value: string) => {
		setCountry(value);
	};

	// Get the current article text
	const currentArticleText = articlesByCategory[category]?.[currentArticleIndex]?.text || "";

	return (
		<main className="min-h-screen flex flex-col">
			<div className="px-3 py-4 flex-grow flex flex-col h-full">
				<div className="flex sm:flex-row justify-between items-center mb-4 gap-2">
					<h1 className="text-2xl font-bold">News Typing Practice</h1>
					<ThemeToggle />
				</div>

				<p className="text-center text-muted-foreground mb-4">Improve your typing skills with real news articles</p>

				{/* Tabs moved above all columns */}
				<Tabs defaultValue="top" value={category} onValueChange={handleCategoryChange} className="flex-grow flex flex-col h-full">
					<div className="flex justify-center mb-4 overflow-x-auto">
						<TabsList className="grid grid-cols-3 md:grid-cols-6">
							{categories.map((cat) => (
								<TabsTrigger key={cat} value={cat} className="capitalize">
									{cat}
								</TabsTrigger>
							))}
						</TabsList>
					</div>

					{/* Error alert */}
					{error && (
						<Alert variant="destructive" className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{/* Tab content with three columns */}
					<TabsContent value={category} className="mt-0 flex-grow flex flex-col">
						<div className="flex-grow flex flex-col lg:flex-row gap-4 h-full">
							{/* Left Panel */}
							<div className="w-full lg:w-1/5 flex">
								<div className="bg-card rounded-lg border shadow-sm p-4 w-full flex flex-col">
									<h2 className="text-lg font-semibold mb-4">Settings</h2>

									<div className="space-y-4 flex-grow">
										<div className="space-y-2">
											<span className="text-sm font-medium">Country :</span>
											<CountrySelector value={country} onChange={handleCountryChange} />
										</div>

										{apiKey && (
											<div className="space-y-2">
												<div className="flex justify-between items-center">
													<span className="text-sm font-medium">API Key:</span>
													<Button variant="ghost" size="sm" onClick={resetApiKey} className="h-6 px-2">
														<Key className="h-3 w-3 mr-1" />
														Change
													</Button>
												</div>
												<div className="text-xs text-muted-foreground">
													{apiKey.substring(0, 4)}...{apiKey.substring(apiKey.length - 4)}
												</div>
											</div>
										)}

										{quota && (
											<div className="text-sm space-y-2">
												<div className="flex justify-between">
													<span className="font-medium">API Quota:</span>
													<span>
														{quota.used}/{quota.used + quota.left}
													</span>
												</div>
												<div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
													<div
														className="bg-blue-500 h-2.5 rounded-full"
														style={{ width: `${Math.round((quota.used / (quota.used + quota.left)) * 100)}%` }}
													></div>
												</div>
											</div>
										)}

										<div className="mt-auto pt-4">
											<div className="flex gap-2">
												<Button onClick={getNextArticle} className="w-full" disabled={loading || (quota && quota.left <= 0)}>
													{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
													Next Article
												</Button>
												<Button onClick={refreshArticles} variant="outline" className="w-full" disabled={loading || (quota && quota.left <= 0)}>
													{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
													Refresh Articles
												</Button>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Main Content */}
							<div className="w-full lg:w-3/5 flex">
								<Card className="w-full flex flex-col">
									<CardContent className="pt-4 flex-grow">
										{loading && articlesByCategory[category]?.length === 0 ? (
											<div className="flex justify-center items-center h-32 flex-grow">
												<Loader2 className="h-8 w-8 animate-spin text-primary" />
											</div>
										) : (
											<div className="flex-grow flex flex-col">
												<TypingTest text={currentArticleText} title={articleTitle} />
											</div>
										)}
									</CardContent>
									<CardFooter className="pt-0 pb-4 border-t">
										{articleSource && (
											<p className="text-xs text-muted-foreground">
												Source:{" "}
												<a href={articleSource} target="_blank" rel="noopener noreferrer" className="underline">
													{articleSource}
												</a>
											</p>
										)}
									</CardFooter>
								</Card>
							</div>

							{/* Right Panel */}
							<div className="w-full lg:w-1/5 flex">
								<div className="bg-card rounded-lg border shadow-sm p-4 w-full flex flex-col">
									<h2 className="text-lg font-semibold mb-4">Stats</h2>

									<div className="space-y-4 flex-grow flex flex-col">
										<div className="flex justify-center mb-2">
											<StreakCounter streak={streak} animated={streakUpdated} />
										</div>

										<div className="space-y-2">
											<div className="flex justify-between">
												<span className="text-sm font-medium">Last Visit:</span>
												<span className="text-sm">{lastVisit ? new Date(lastVisit).toLocaleDateString() : "Never"}</span>
											</div>

											<div className="flex justify-between">
												<span className="text-sm font-medium">Current Category:</span>
												<span className="text-sm capitalize">{category}</span>
											</div>

											<div className="flex justify-between">
												<span className="text-sm font-medium">Articles Available:</span>
												<span className="text-sm">{articlesByCategory[category]?.length || 0}</span>
											</div>

											<div className="flex justify-between">
												<span className="text-sm font-medium">Current Article:</span>
												<span className="text-sm">
													{currentArticleIndex + 1} of {articlesByCategory[category]?.length || 0}
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</main>
	);
}

// Wrap the app with the NewsProvider
export default function Home() {
	return (
		<NewsProvider>
			<TypingNewsApp />
		</NewsProvider>
	);
}
