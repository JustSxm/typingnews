"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

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
	hasMoreArticles: boolean;
}

// Define the context actions
interface NewsContextActions {
	setCategory: (category: string) => void;
	setCountry: (country: string) => void;
	getNextArticle: () => void;
	refreshArticles: () => void;
}

// Create the context
const NewsContext = createContext<(NewsContextState & NewsContextActions) | undefined>(undefined);

// Define the categories
export const categories = ["top", "politics", "sports", "business", "technology", "entertainment"];

export const NewsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	// State for articles and pagination
	// In the NewsProvider component, replace the articles state with articlesByCategory
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

	// Fetch articles from the API
	// Replace the fetchArticles function with this updated version that caches by category
	const fetchArticles = useCallback(
		async (reset = false) => {
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
				const response = await fetch(`/api/news?category=${category}&country=${country}${offsetParam}`);
				const result = await response.json();

				if (result.error) {
					throw new Error(result.error);
				}

				// Update quota information
				if (result.quota) {
					setQuota(result.quota);
				}

				if (result.data && result.data.news && result.data.news.length > 0) {
					// Process the articles
					const newArticles = result.data.news.map((article: any) => {
						// Combine title and text
						let fullText = `${article.title}\n\n`;

						if (article.text) {
							// Remove any HTML tags
							const cleanContent = article.text.replace(/<[^>]*>/g, "");
							fullText += cleanContent;
						}

						// Normalize newlines - replace multiple newlines with a single newline
						const normalizedText = fullText.trim().replace(/\n{2,}/g, "\n");

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
				setError("Failed to load news. Please try again.");
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
		[category, country, articlesByCategory, quota]
	);

	// Update the initial fetch effect to only fetch if we don't have articles for this category
	useEffect(() => {
		if (!articlesByCategory[category] || articlesByCategory[category].length === 0) {
			fetchArticles(true);
		} else {
			// Reset the current article index when changing categories
			setCurrentArticleIndex(0);
		}
	}, [category, country]);

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

	// Get the current article source
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
		hasMoreArticles,
		setCategory,
		setCountry,
		getNextArticle,
		refreshArticles,
	};

	return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
};

// Hook to use the news context
export const useNews = () => {
	const context = useContext(NewsContext);
	if (context === undefined) {
		throw new Error("useNews must be used within a NewsProvider");
	}
	return context;
};
