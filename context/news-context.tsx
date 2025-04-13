"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ApiKeyModal } from "@/components/api-key-modal";

// Define the structure of a news article
export interface NewsArticle {
	id: number | string;
	title: string;
	text: string;
	url: string;
	image?: string;
	publish_date: string;
	author?: string;
	authors?: string[];
	source_country?: string;
	sentiment?: number;
	language?: string;
	summary?: string;
	video?: string | null;
}

// Define the structure of API quota information
export interface ApiQuota {
	request: number;
	used: number;
	left: number;
}

// Update the context state to include a cache by category
interface NewsContextState {
	articlesByCategory: Record<string, NewsArticle[]>;
	currentArticleIndex: number;
	loading: boolean;
	error: string | null;
	category: string;
	country: string;
	quota: ApiQuota | null;
	articleSource: string;
	articleTitle: string;
	hasMoreArticles: boolean;
	apiKey: string | null;
	showApiKeyModal: boolean;
}

// Define the context actions
interface NewsContextActions {
	setCategory: (category: string) => void;
	setCountry: (country: string) => void;
	getNextArticle: () => void;
	refreshArticles: () => void;
	setApiKey: (key: string | null) => void;
	resetApiKey: () => void;
}

// Create the context
const NewsContext = createContext<(NewsContextState & NewsContextActions) | undefined>(undefined);

// Define the categories
export const categories = ["top", "politics", "sports", "business", "technology", "entertainment"];

export const NewsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	// State for articles and pagination
	const [articlesByCategory, setArticlesByCategory] = useState<Record<string, NewsArticle[]>>({});
	const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
	const [offset, setOffset] = useState(0);
	const [hasMoreArticles, setHasMoreArticles] = useState(true);

	// State for API parameters and status
	const [category, setCategory] = useState("top");
	const [country, setCountry] = useState("us");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [quota, setQuota] = useState<ApiQuota | null>(null);

	// API key state
	const [apiKey, setApiKey] = useState<string | null>(null);
	const [showApiKeyModal, setShowApiKeyModal] = useState(false);
	const [apiKeyError, setApiKeyError] = useState<string | null>(null);

	// Load API key from localStorage on initial render
	useEffect(() => {
		const storedApiKey = localStorage.getItem("worldNewsApiKey");
		if (storedApiKey) {
			setApiKey(storedApiKey);
		} else {
			setShowApiKeyModal(true);
		}
	}, []);

	// Reset API key
	const resetApiKey = useCallback(() => {
		localStorage.removeItem("worldNewsApiKey");
		setApiKey(null);
		setShowApiKeyModal(true);
		setApiKeyError(null);
	}, []);

	// Handle API key modal close
	const handleApiKeyModalClose = useCallback((newApiKey?: string) => {
		if (newApiKey) {
			setApiKey(newApiKey);
			setApiKeyError(null);
			// Refresh articles with the new API key
			setArticlesByCategory({});
		}
		setShowApiKeyModal(false);
	}, []);

	// Fetch articles from the API
	const fetchArticles = useCallback(
		async (reset = false) => {
			// If no API key, show the modal
			if (!apiKey) {
				setShowApiKeyModal(true);
				setLoading(false);
				return;
			}

			// If we're resetting, clear the articles for this category and reset the index
			if (reset) {
				setCurrentArticleIndex(0);
				setOffset(0);
				setHasMoreArticles(true);
			}

			setLoading(true);
			setError(null);

			try {
				// Check if we have quota left
				if (quota && quota.left <= 0) {
					setError("API quota exceeded. Please try again later.");
					setLoading(false);
					return;
				}

				// Add offset parameter for pagination (except for top news)
				const currentOffset = reset ? 0 : articlesByCategory[category]?.length || 0;
				const offsetParam = category !== "top" && !reset ? `&offset=${currentOffset}` : "";
				const response = await fetch(`/api/news?category=${category}&country=${country}${offsetParam}&apiKey=${apiKey}`);
				const result = await response.json();

				if (result.error) {
					// Check if the error is related to the API key
					if (response.status === 401 || response.status === 403 || result.error.includes("API key")) {
						setApiKeyError(result.error);
						setShowApiKeyModal(true);
						throw new Error(result.error);
					} else {
						throw new Error(result.error);
					}
				}

				// Update quota information
				if (result.quota) {
					setQuota(result.quota);
				}

				if (result.data && result.data.news && result.data.news.length > 0) {
					// Process the articles
					const newArticles = result.data.news.map((article: any) => {
						// Keep the title separate and only include the text content for typing
						let processedText = "";

						if (article.text) {
							// Remove any HTML tags
							const cleanContent = article.text.replace(/<[^>]*>/g, "");
							processedText = cleanContent;
						}

						// Normalize newlines - replace multiple newlines with a single newline
						const normalizedText = processedText.trim().replace(/\n{2,}/g, "\n");

						return {
							...article,
							text: normalizedText,
						};
					});

					// Update the articles for this category
					setArticlesByCategory((prev) => ({
						...prev,
						[category]: reset ? newArticles : [...(prev[category] || []), ...newArticles],
					}));

					// Update offset for next fetch
					setOffset((prev) => prev + newArticles.length);

					// Check if we have more articles to fetch
					setHasMoreArticles(newArticles.length >= 10);
				} else {
					if (reset) {
						// If no articles on initial load, show an error
						setArticlesByCategory((prev) => ({
							...prev,
							[category]: [
								{
									id: "no-news",
									title: "No news available",
									text: "No news available at the moment. Please try another category or refresh.",
									url: "",
									publish_date: new Date().toISOString(),
								},
							],
						}));
					}
					setHasMoreArticles(false);
				}
			} catch (error) {
				console.error("Error fetching news:", error);

				// Don't set error if it's an API key issue (modal will show instead)
				if (!apiKeyError) {
					setError("Failed to load news. Please try again.");
				}

				if (reset) {
					setArticlesByCategory((prev) => ({
						...prev,
						[category]: [
							{
								id: "error",
								title: "Error loading news",
								text: "Failed to load news. Please try again.",
								url: "",
								publish_date: new Date().toISOString(),
							},
						],
					}));
				}
			} finally {
				setLoading(false);
			}
		},
		[category, country, articlesByCategory, quota, apiKey, apiKeyError]
	);

	// Handle category change
	const handleCategoryChange = useCallback(
		(newCategory: string) => {
			setCategory(newCategory);
			setCurrentArticleIndex(0); // Reset to the first article when changing categories

			// If we don't have articles for this category yet, fetch them
			if (!articlesByCategory[newCategory] || articlesByCategory[newCategory].length === 0) {
				setLoading(true); // Set loading state immediately
			}
		},
		[articlesByCategory]
	);

	// Update the initial fetch effect to only fetch if we don't have articles for this category
	useEffect(() => {
		if (apiKey && (!articlesByCategory[category] || articlesByCategory[category].length === 0)) {
			fetchArticles(true);
		}
	}, [category, country, apiKey, fetchArticles, articlesByCategory]);

	// Update the getNextArticle function to work with the category-based cache
	const getNextArticle = useCallback(() => {
		const articlesForCategory = articlesByCategory[category] || [];

		// If we're at the end of our cached articles
		if (currentArticleIndex >= articlesForCategory.length - 1) {
			// If we have more articles to fetch, fetch them
			if (hasMoreArticles) {
				fetchArticles(false);
			}
			// Either way, go to the next article (which might be the first one if we've reached the end)
			setCurrentArticleIndex((prev) => (prev + 1) % Math.max(articlesForCategory.length, 1));
		} else {
			// Otherwise, just go to the next article
			setCurrentArticleIndex((prev) => prev + 1);
		}
	}, [currentArticleIndex, articlesByCategory, category, hasMoreArticles, fetchArticles]);

	// Refresh articles
	const refreshArticles = useCallback(() => {
		fetchArticles(true);
	}, [fetchArticles]);

	// Get the current article title
	const articleTitle = articlesByCategory[category]?.[currentArticleIndex]?.title || "";

	// Update the context value
	const value = {
		articlesByCategory,
		currentArticleIndex,
		loading,
		error,
		category,
		country,
		quota,
		articleSource: articlesByCategory[category]?.[currentArticleIndex]?.url || "",
		articleTitle,
		hasMoreArticles,
		apiKey,
		showApiKeyModal,
		setCategory: handleCategoryChange,
		setCountry,
		getNextArticle,
		refreshArticles,
		setApiKey,
		resetApiKey,
	};

	return (
		<NewsContext.Provider value={value}>
			{children}
			<ApiKeyModal isOpen={showApiKeyModal} onClose={handleApiKeyModalClose} error={apiKeyError} />
		</NewsContext.Provider>
	);
};

// Hook to use the news context
export const useNews = () => {
	const context = useContext(NewsContext);
	if (context === undefined) {
		throw new Error("useNews must be used within a NewsProvider");
	}
	return context;
};
