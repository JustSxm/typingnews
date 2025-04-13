import { type NextRequest, NextResponse } from "next/server";

// Define the structure of a WorldNewsAPI article
interface WorldNewsArticle {
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

// Define the structure of the WorldNewsAPI category search response
interface WorldNewsCategoryResponse {
	offset: number;
	number: number;
	available: number;
	news: WorldNewsArticle[];
}

// Define the structure of the WorldNewsAPI top news response
interface WorldNewsTopResponse {
	top_news: {
		news: WorldNewsArticle[];
	}[];
	language: string;
	country: string;
}

// Define the structure for API quota information
interface ApiQuota {
	request: number;
	used: number;
	left: number;
}

export async function GET(request: NextRequest) {
	// Get category, country, and offset from query parameters
	const { searchParams } = new URL(request.url);
	const category = searchParams.get("category") || "top";
	const country = searchParams.get("country") || "us";
	const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

	try {
		// Check if we have an API key
		const apiKey = process.env.WORLD_NEWS_API_KEY;

		if (!apiKey) {
			return NextResponse.json({ error: "API key is missing. Please set the WORLD_NEWS_API_KEY environment variable." }, { status: 500 });
		}

		// Determine language based on country
		const language = country === "ca" ? "fr" : "en";

		// Construct the API URL based on category
		let apiUrl: string;

		if (category === "top") {
			apiUrl = `https://api.worldnewsapi.com/top-news?source-country=${country}&language=${language}&api-key=${apiKey}`;
		} else {
			apiUrl = `https://api.worldnewsapi.com/search-news?language=${language}&source-country=${country}&categories=${category}&number=10&offset=${offset}&api-key=${apiKey}`;
		}

		// Fetch news from WorldNewsAPI
		const response = await fetch(apiUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour

		if (!response.ok) {
			throw new Error(`News API responded with status: ${response.status}`);
		}

		// Extract quota information from headers
		const quota: ApiQuota = {
			request: Number.parseInt(response.headers.get("X-API-Quota-Request") || "0", 10),
			used: Number.parseInt(response.headers.get("X-API-Quota-Used") || "0", 10),
			left: Number.parseInt(response.headers.get("X-API-Quota-Left") || "0", 10),
		};

		const data = await response.json();

		// Process the data based on the category
		let processedData: WorldNewsArticle[] = [];

		if (category === "top") {
			// Handle top news format
			const topNewsData = data as WorldNewsTopResponse;
			// Flatten the nested news arrays
			topNewsData.top_news.forEach((group) => {
				if (group.news && Array.isArray(group.news)) {
					processedData = [...processedData, ...group.news];
				}
			});
		} else {
			// Handle category search format
			const categoryData = data as WorldNewsCategoryResponse;
			processedData = categoryData.news;
		}

		// Return both the processed news data and quota information
		return NextResponse.json({
			data: {
				news: processedData,
				available: processedData.length,
			},
			quota,
		});
	} catch (error) {
		console.error("Error fetching news:", error);
		return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
	}
}

// Mock data function for development/testing without API key
export function getMockWorldNewsData(category: string, country = "us", offset = 0): { data: { news: WorldNewsArticle[]; available: number }; quota: ApiQuota } {
	const language = country === "ca" ? "fr" : "en";

	// Sample articles for each category
	const mockArticles: { [key: string]: WorldNewsArticle[] } = {
		top: [
			{
				id: 1,
				title: country === "ca" ? "Sommet mondial sur le changement climatique" : "Global Climate Summit Addresses Key Issues",
				text:
					country === "ca"
						? "Les dirigeants mondiaux se sont réunis pour discuter des actions urgentes contre le changement climatique et fixer de nouveaux objectifs d'émission. Lors d'une réunion historique, des représentants de plus de 190 pays ont convenu d'accélérer les efforts pour lutter contre le changement climatique. Le sommet, qui a duré trois jours, s'est conclu par une déclaration commune soulignant la nécessité d'une action immédiate pour réduire les émissions de carbone. Plusieurs grandes économies ont annoncé de nouveaux objectifs visant à atteindre la neutralité carbone d'ici 2050."
						: "World leaders gather to discuss urgent climate action and set new emission targets. In a historic meeting, representatives from over 190 countries have agreed to accelerate efforts to combat climate change. The summit, which lasted for three days, concluded with a joint statement emphasizing the need for immediate action to reduce carbon emissions. Several major economies announced new targets that aim to achieve carbon neutrality by 2050.",
				url: "https://example.com/news/1",
				publish_date: new Date().toISOString(),
				source_country: country,
				language: language,
			},
			{
				id: 2,
				title: country === "ca" ? "Nouvelle étude sur les bienfaits du régime méditerranéen" : "New Study Shows Benefits of Mediterranean Diet",
				text:
					country === "ca"
						? "Une étude complète de 10 ans a démontré des améliorations significatives de la santé chez les participants suivant un régime méditerranéen traditionnel. La recherche, menée dans plusieurs pays avec plus de 12 000 participants, a révélé que ceux qui adhéraient constamment à un régime riche en huile d'olive, noix, fruits, légumes et poisson avaient un risque de maladie cardiaque inférieur de 30 % et une réduction de 22 % de la mortalité globale."
						: "A comprehensive 10-year study has demonstrated significant health improvements among participants following a traditional Mediterranean diet. The research, conducted across multiple countries with over 12,000 participants, found that those who consistently adhered to a diet rich in olive oil, nuts, fruits, vegetables, and fish had a 30% lower risk of heart disease and a 22% reduction in overall mortality.",
				url: "https://example.com/news/2",
				publish_date: new Date().toISOString(),
				source_country: country,
				language: language,
			},
		],
		politics: [
			{
				id: 3,
				title: country === "ca" ? "Débat sur la réforme électorale" : "Electoral Reform Debate Heats Up",
				text:
					country === "ca"
						? "Les législateurs débattent d'un projet de loi controversé qui modifierait fondamentalement le système électoral. Les partisans affirment que les changements proposés rendraient les élections plus équitables et plus accessibles, tandis que les critiques soutiennent qu'ils pourraient favoriser un parti au détriment des autres. Des manifestations ont eu lieu dans plusieurs grandes villes, avec des citoyens exprimant des opinions des deux côtés du débat."
						: "Lawmakers debate controversial bill that would fundamentally change the electoral system. Supporters say the proposed changes would make elections more fair and accessible, while critics argue they could favor one party over others. Protests have erupted in several major cities, with citizens expressing views on both sides of the debate.",
				url: "https://example.com/news/3",
				publish_date: new Date().toISOString(),
				source_country: country,
				language: language,
			},
			{
				id: 4,
				title: country === "ca" ? "Nouveau sondage montre un changement dans l'opinion publique" : "New Poll Shows Shift in Public Opinion",
				text:
					country === "ca"
						? "Un sondage national récent indique un changement significatif dans l'opinion publique sur plusieurs questions politiques clés. Les résultats suggèrent que les électeurs sont de plus en plus préoccupés par les inégalités économiques et le changement climatique, tandis que les inquiétudes concernant l'immigration ont diminué par rapport aux années précédentes. Les analystes politiques suggèrent que ce changement pourrait influencer les stratégies de campagne pour les prochaines élections."
						: "A recent national poll indicates a significant shift in public opinion on several key political issues. The results suggest voters are increasingly concerned about economic inequality and climate change, while worries about immigration have decreased compared to previous years. Political analysts suggest this shift could influence campaign strategies for upcoming elections.",
				url: "https://example.com/news/4",
				publish_date: new Date().toISOString(),
				source_country: country,
				language: language,
			},
		],
		// Add more mock articles for other categories...
	};

	// Map our categories to mock data categories
	const categoryMap: Record<string, string> = {
		top: "top",
		politics: "politics",
		sports: "politics", // Reuse politics for sports
		business: "politics", // Reuse politics for business
		technology: "politics", // Reuse politics for technology
		entertainment: "politics", // Reuse politics for entertainment
	};

	const mappedCategory = categoryMap[category] || "top";

	// Get articles for the requested category
	const allArticles = mockArticles[mappedCategory] || mockArticles.top;

	// Apply offset and limit
	const startIndex = offset;
	const endIndex = startIndex + 10;
	const paginatedArticles = allArticles.slice(startIndex, endIndex);

	return {
		data: {
			news: paginatedArticles,
			available: paginatedArticles.length,
		},
		quota: {
			request: 1,
			used: 10,
			left: 990,
		},
	};
}
