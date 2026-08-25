const HUE_CITY_NAME = 'Thành phố Huế';

type LocationAddressLike = {
    addressLine?: string | null;
    wardNameSnapshot?: string | null;
};

type LocationLike = {
    address?: LocationAddressLike | null;
};

export const normalizeLocationAddressLine = (value: string) => value.trim().replace(/\s+/g, ' ');

export const formatLocationAddress = (location: LocationLike | LocationAddressLike) => {
    const address: LocationAddressLike | null | undefined = 'address' in location
        ? location.address
        : location as LocationAddressLike;
    return [address?.addressLine, address?.wardNameSnapshot, HUE_CITY_NAME]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(', ');
};
