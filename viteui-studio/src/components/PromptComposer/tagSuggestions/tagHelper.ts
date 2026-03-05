import danbooru from './danbooru.json';
import e621 from './e621.json';
import derpibooru from './derpibooru.json';
import danbooru_e621_merged from './danbooru_e621_merged.json';
import e621_sfw from './e621_sfw.json';
import stable_diffusion from './stable_diffusion.json';

export interface TagSuggestion {
    v: string; // value
    c: number; // category
    p: number; // post count
}

export const TAG_SOURCES: Record<string, TagSuggestion[]> = {
    'Danbooru': danbooru as TagSuggestion[],
    'e621': e621 as TagSuggestion[],
    'Derpibooru': derpibooru as TagSuggestion[],
    'Danbooru + e621': danbooru_e621_merged as TagSuggestion[],
    'e621 (SFW)': e621_sfw as TagSuggestion[],
    'Stable-Diffusion': stable_diffusion as TagSuggestion[]
};

export const getSuggestions = (query: string, source: string = 'Danbooru', limit: number = 1000): TagSuggestion[] => {
    if (!query || query.length < 1) return [];
    
    const tags = TAG_SOURCES[source] || TAG_SOURCES['Danbooru'];
    const lowercaseQuery = query.toLowerCase().replace(/ /g, '_');
    
    return tags
        .filter(tag => tag.v.toLowerCase().includes(lowercaseQuery))
        .sort((a, b) => {
            // Priority 1: Exact match
            if (a.v === lowercaseQuery) return -1;
            if (b.v === lowercaseQuery) return 1;
            
            // Priority 2: Starts with query
            const aStarts = a.v.toLowerCase().startsWith(lowercaseQuery);
            const bStarts = b.v.toLowerCase().startsWith(lowercaseQuery);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;
            
            // Priority 3: Post count
            return b.p - a.p;
        })
        .slice(0, limit);
};

export const getCategoryName = (category: number): string => {
    switch (category) {
        case 0: return 'General';
        case 1: return 'Artist';
        case 3: return 'Copyright';
        case 4: return 'Character';
        case 5: return 'Meta';
        default: return 'Other';
    }
};

export const getCategoryColor = (category: number): string => {
    switch (category) {
        case 0: return '#0096fa'; // General - Blue
        case 1: return '#c00004'; // Artist - Red
        case 3: return '#a800aa'; // Copyright - Purple
        case 4: return '#00ab2c'; // Character - Green
        case 5: return '#fd9226'; // Meta - Orange
        default: return '#cccccc';
    }
};
