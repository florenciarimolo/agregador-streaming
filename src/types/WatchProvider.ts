export type WatchProvider = {
    display_priority: number;
    logo_path: string | null;
    provider_name: string;
}

type FlatrateWatchProvider = {
    flatrate: WatchProvider[];
}

type BuyWatchProvider = {
    buy: WatchProvider[];
}

type RentWatchProvider = {
    rent: WatchProvider[];
}

export type CountryWatchProvider = {
    ES: {
        flatrate?: FlatrateWatchProvider;
        buy?: BuyWatchProvider;
        rent?: RentWatchProvider;
    }
}

export type WatchProviderResponse = {
    results: CountryWatchProvider;
}

