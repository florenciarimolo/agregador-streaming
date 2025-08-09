export type WatchProvider = {
    display_priority: number;
    logo_path: string | null;
    provider_name: string;
}

export type WatchProviderTypes = {
    flatrate?: WatchProvider[];
    buy?: WatchProvider[];
    rent?: WatchProvider[];
}

export type CountryWatchProvider = {
    ES: {
        flatrate?: WatchProvider[];
        buy?: WatchProvider[];
        rent?: WatchProvider[];
    }
}

export type WatchProviderResponse = {
    results: CountryWatchProvider;
}