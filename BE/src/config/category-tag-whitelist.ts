export interface CategoryTagRule {
    allowedTagCodes: string[];
    recommendedTagCodes: string[];
}

export const categoryTagWhitelist: Record<string, CategoryTagRule> = {
    historical_site: {
        allowedTagCodes: ['quiet', 'traditional_ambience', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wheelchair_accessible', 'restroom', 'sightseeing', 'photography', 'cultural_experience', 'free_entry', 'budget', 'mid_range'],
        recommendedTagCodes: ['traditional_ambience', 'family', 'sightseeing', 'photography', 'cultural_experience'],
    },
    religious_site: {
        allowedTagCodes: ['quiet', 'traditional_ambience', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'groups', 'solo_travelers', 'parking', 'wheelchair_accessible', 'restroom', 'sightseeing', 'photography', 'cultural_experience', 'free_entry'],
        recommendedTagCodes: ['quiet', 'traditional_ambience', 'sightseeing', 'cultural_experience', 'free_entry'],
    },
    museum_cultural: {
        allowedTagCodes: ['quiet', 'traditional_ambience', 'indoor', 'outdoor', 'family', 'children', 'groups', 'solo_travelers', 'parking', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'sightseeing', 'photography', 'cultural_experience', 'free_entry', 'budget', 'mid_range'],
        recommendedTagCodes: ['indoor', 'family', 'wheelchair_accessible', 'sightseeing', 'cultural_experience'],
    },
    craft_village: {
        allowedTagCodes: ['quiet', 'lively', 'traditional_ambience', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'restroom', 'sightseeing', 'photography', 'cultural_experience', 'outdoor_activity', 'local_food', 'vegetarian_options', 'takeaway', 'free_entry', 'budget', 'mid_range'],
        recommendedTagCodes: ['traditional_ambience', 'family', 'photography', 'cultural_experience', 'local_food'],
    },
    natural_attraction: {
        allowedTagCodes: ['quiet', 'romantic', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wheelchair_accessible', 'restroom', 'pet_friendly', 'sightseeing', 'photography', 'outdoor_activity', 'free_entry', 'budget', 'mid_range'],
        recommendedTagCodes: ['outdoor', 'scenic_view', 'family', 'photography', 'outdoor_activity'],
    },
    cafe: {
        allowedTagCodes: ['quiet', 'lively', 'cozy', 'romantic', 'traditional_ambience', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'pet_friendly', 'photography', 'nightlife', 'local_food', 'vegetarian_options', 'takeaway', 'reservation_available', 'budget', 'mid_range', 'premium'],
        recommendedTagCodes: ['quiet', 'cozy', 'wifi', 'garden_space', 'budget'],
    },
    restaurant: {
        allowedTagCodes: ['quiet', 'lively', 'cozy', 'romantic', 'traditional_ambience', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'pet_friendly', 'nightlife', 'local_food', 'vegetarian_options', 'takeaway', 'reservation_available', 'budget', 'mid_range', 'premium'],
        recommendedTagCodes: ['family', 'parking', 'local_food', 'vegetarian_options', 'reservation_available'],
    },
    market_shopping: {
        allowedTagCodes: ['lively', 'traditional_ambience', 'indoor', 'outdoor', 'family', 'children', 'groups', 'solo_travelers', 'parking', 'wheelchair_accessible', 'restroom', 'sightseeing', 'photography', 'cultural_experience', 'nightlife', 'local_food', 'vegetarian_options', 'takeaway', 'budget', 'mid_range'],
        recommendedTagCodes: ['lively', 'traditional_ambience', 'photography', 'local_food', 'budget'],
    },
    hotel: {
        allowedTagCodes: ['quiet', 'lively', 'cozy', 'romantic', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'pet_friendly', 'breakfast_included', 'swimming_pool', 'airport_shuttle', 'twenty_four_hour_reception', 'budget', 'mid_range', 'premium'],
        recommendedTagCodes: ['quiet', 'wifi', 'air_conditioning', 'breakfast_included', 'twenty_four_hour_reception'],
    },
    homestay_guesthouse: {
        allowedTagCodes: ['quiet', 'cozy', 'romantic', 'traditional_ambience', 'indoor', 'outdoor', 'garden_space', 'riverside', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'restroom', 'pet_friendly', 'local_food', 'vegetarian_options', 'breakfast_included', 'airport_shuttle', 'twenty_four_hour_reception', 'budget', 'mid_range', 'premium'],
        recommendedTagCodes: ['cozy', 'traditional_ambience', 'wifi', 'local_food', 'breakfast_included'],
    },
    entertainment: {
        allowedTagCodes: ['lively', 'cozy', 'indoor', 'outdoor', 'garden_space', 'scenic_view', 'family', 'children', 'couples', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'pet_friendly', 'photography', 'outdoor_activity', 'nightlife', 'local_food', 'vegetarian_options', 'takeaway', 'reservation_available', 'budget', 'mid_range', 'premium'],
        recommendedTagCodes: ['lively', 'family', 'children', 'outdoor_activity', 'nightlife'],
    },
    transport_hub: {
        allowedTagCodes: ['lively', 'indoor', 'outdoor', 'groups', 'solo_travelers', 'parking', 'wifi', 'air_conditioning', 'wheelchair_accessible', 'restroom', 'local_food', 'vegetarian_options', 'takeaway'],
        recommendedTagCodes: ['parking', 'wifi', 'wheelchair_accessible', 'restroom', 'takeaway'],
    },
};
