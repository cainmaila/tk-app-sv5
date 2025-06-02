export interface ChatMessage {
	id: string;
	role: 'user' | 'model';
	text: string;
	sources?: GroundingSource[];
}

export interface GroundingSource {
	uri: string;
	title: string;
}

// This is a simplified representation of what we might get from groundingMetadata.
// The actual type from @google/genai is GroundingAttribution, which can have more fields.
// We'll map to GroundingSource for our app's use.
export interface RawGroundingChunk {
	web?: {
		uri: string;
		title: string;
	};
	// other types like 'retrievedContext' could exist
}
