interface WikiSearchResult {
    query: {
        search: {
            pageid: number;
            title: string;
        }[];
    };
}

interface WikiPageResult {
    query: {
        pages: {
            [key: string]: {
                thumbnail?: {
                    source: string;
                    width: number;
                    height: number;
                };
            };
        };
    };
}

export async function fetchCarImage(make: string, model: string): Promise<string | null> {
    try {
        // Search for the specific model
        const searchTerm = `${make} ${model}`;
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
            searchTerm
        )}&format=json&origin=*`;

        const searchResponse = await fetch(searchUrl);
        const searchData: WikiSearchResult = await searchResponse.json();

        if (!searchData.query.search.length) return null;

        // Use the first result to get the page image
        const pageId = searchData.query.search[0].pageid;
        const detailsUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&pageids=${pageId}&pithumbsize=800&format=json&origin=*`;

        const detailsResponse = await fetch(detailsUrl);
        const detailsData: WikiPageResult = await detailsResponse.json();

        const page = detailsData.query.pages[pageId];
        return page.thumbnail?.source || null;
    } catch (error) {
        console.error("Error fetching car image:", error);
        return null;
    }
}
