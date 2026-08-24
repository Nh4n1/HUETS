export interface CategoryTagRule {
    allowedTagCodes: string[];
}

export const categoryTagWhitelist: Record<string, CategoryTagRule> = {
    historical_site: {
        allowedTagCodes: ['quiet', 'traditional_ambience', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wheelchair_accessible', 'restroom', 'sightseeing', 'photography', 'cultural_experience', 'free_entry', 'budget', 'mid_range'],
    },
    religious_site: {
        allowedTagCodes: ['quiet', 'traditional_ambience', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'groups', 'solo_travelers', 'parking', 'wheelchair_accessible', 'restroom', 'sightseeing', 'photography', 'cultural_experience', 'free_entry'],
    },
    museum_cultural: {
        allowedTagCodes: ['quiet', 'traditional_ambience', 'indoor', 'outdoor', 'family', 'children', 'groups', 'solo_travelers', 'parking', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'sightseeing', 'photography', 'cultural_experience', 'free_entry', 'budget', 'mid_range'],
    },
    craft_village: {
        allowedTagCodes: ['quiet', 'lively', 'traditional_ambience', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'restroom', 'sightseeing', 'photography', 'cultural_experience', 'outdoor_activity', 'local_food', 'vegetarian_options', 'takeaway', 'free_entry', 'budget', 'mid_range'],
    },
    natural_attraction: {
        allowedTagCodes: ['quiet', 'romantic', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wheelchair_accessible', 'restroom', 'pet_friendly', 'sightseeing', 'photography', 'outdoor_activity', 'free_entry', 'budget', 'mid_range'],
    },
    cafe: {
        allowedTagCodes: ['quiet', 'lively', 'cozy', 'romantic', 'traditional_ambience', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'pet_friendly', 'photography', 'nightlife', 'local_food', 'vegetarian_options', 'takeaway', 'reservation_available', 'budget', 'mid_range', 'premium'],
    },
    restaurant: {
        allowedTagCodes: ['quiet', 'lively', 'cozy', 'romantic', 'traditional_ambience', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'pet_friendly', 'nightlife', 'local_food', 'vegetarian_options', 'takeaway', 'reservation_available', 'budget', 'mid_range', 'premium'],
    },
    market_shopping: {
        allowedTagCodes: ['lively', 'traditional_ambience', 'indoor', 'outdoor', 'family', 'children', 'groups', 'solo_travelers', 'parking', 'wheelchair_accessible', 'restroom', 'sightseeing', 'photography', 'cultural_experience', 'nightlife', 'local_food', 'vegetarian_options', 'takeaway', 'budget', 'mid_range'],
    },
    hotel: {
        allowedTagCodes: ['quiet', 'lively', 'cozy', 'romantic', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'pet_friendly', 'breakfast_included', 'swimming_pool', 'airport_shuttle', 'twenty_four_hour_reception', 'budget', 'mid_range', 'premium'],
    },
    homestay_guesthouse: {
        allowedTagCodes: ['quiet', 'cozy', 'romantic', 'traditional_ambience', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'restroom', 'pet_friendly', 'local_food', 'vegetarian_options', 'breakfast_included', 'airport_shuttle', 'twenty_four_hour_reception', 'budget', 'mid_range', 'premium'],
    },
    entertainment: {
        allowedTagCodes: ['lively', 'cozy', 'indoor', 'outdoor', 'garden_space', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'pet_friendly', 'photography', 'outdoor_activity', 'nightlife', 'local_food', 'vegetarian_options', 'takeaway', 'reservation_available', 'budget', 'mid_range', 'premium'],
    },
    transport_hub: {
        allowedTagCodes: ['lively', 'indoor', 'outdoor', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'local_food', 'vegetarian_options', 'takeaway'],
    },
};
