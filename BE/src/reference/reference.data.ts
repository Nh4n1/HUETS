import type { TagSelectionMode } from '../models/tagGroup.model.ts';

export interface ReferenceCategory {
    code: string;
    name: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
}

export interface ReferenceTag {
    code: string;
    name: string;
    isActive: boolean;
}

export interface ReferenceTagGroup {
    code: string;
    name: string;
    selectionMode: TagSelectionMode;
    tags: ReferenceTag[];
    isActive: boolean;
}

export const categories: ReferenceCategory[] = [
    { code: 'historical_site', name: 'Di tích lịch sử', description: 'Di tích, công trình và địa điểm có giá trị lịch sử.', sortOrder: 1, isActive: true },
    { code: 'religious_site', name: 'Địa điểm tôn giáo', description: 'Chùa, đền, nhà thờ và công trình tín ngưỡng.', sortOrder: 2, isActive: true },
    { code: 'museum_cultural', name: 'Bảo tàng và văn hóa', description: 'Bảo tàng, không gian trưng bày và điểm sinh hoạt văn hóa.', sortOrder: 3, isActive: true },
    { code: 'craft_village', name: 'Làng nghề', description: 'Làng nghề truyền thống và không gian trải nghiệm thủ công.', sortOrder: 4, isActive: true },
    { code: 'natural_attraction', name: 'Điểm tham quan thiên nhiên', description: 'Cảnh quan, sinh thái và điểm tham quan ngoài trời.', sortOrder: 5, isActive: true },
    { code: 'cafe', name: 'Quán cà phê', description: 'Quán cà phê và không gian đồ uống.', sortOrder: 6, isActive: true },
    { code: 'restaurant', name: 'Nhà hàng và ẩm thực', description: 'Nhà hàng, quán ăn và điểm trải nghiệm ẩm thực.', sortOrder: 7, isActive: true },
    { code: 'market_shopping', name: 'Chợ và mua sắm', description: 'Chợ, cửa hàng và khu mua sắm.', sortOrder: 8, isActive: true },
    { code: 'hotel', name: 'Khách sạn', description: 'Khách sạn và cơ sở lưu trú tương đương.', sortOrder: 9, isActive: true },
    { code: 'homestay_guesthouse', name: 'Homestay và nhà nghỉ', description: 'Homestay, guesthouse và lưu trú cộng đồng.', sortOrder: 10, isActive: true },
    { code: 'entertainment', name: 'Giải trí', description: 'Điểm vui chơi, giải trí và hoạt động về đêm.', sortOrder: 11, isActive: true },
    { code: 'transport_hub', name: 'Điểm giao thông', description: 'Ga, bến xe, sân bay và đầu mối giao thông.', sortOrder: 12, isActive: true },
];

const activeTag = (code: string, name: string): ReferenceTag => ({ code, name, isActive: true });

export const tagGroups: ReferenceTagGroup[] = [
    {
        code: 'atmosphere',
        name: 'Không khí',
        selectionMode: 'multiple',
        isActive: true,
        tags: [
            activeTag('quiet', 'Yên tĩnh'),
            activeTag('lively', 'Sôi động'),
            activeTag('cozy', 'Ấm cúng'),
            activeTag('romantic', 'Lãng mạn'),
            activeTag('traditional_ambience', 'Không gian truyền thống'),
        ],
    },
    {
        code: 'environment',
        name: 'Không gian',
        selectionMode: 'multiple',
        isActive: true,
        tags: [
            activeTag('indoor', 'Trong nhà'),
            activeTag('outdoor', 'Ngoài trời'),
            activeTag('garden_space', 'Không gian sân vườn'),
            activeTag('riverside', 'Ven sông'),
            activeTag('scenic_view', 'Có cảnh đẹp'),
        ],
    },
    {
        code: 'suitable_for',
        name: 'Phù hợp với',
        selectionMode: 'multiple',
        isActive: true,
        tags: [
            activeTag('family', 'Gia đình'),
            activeTag('children', 'Trẻ em'),
            activeTag('couples', 'Cặp đôi'),
            activeTag('groups', 'Nhóm bạn'),
            activeTag('solo_travelers', 'Khách đi một mình'),
        ],
    },
    {
        code: 'amenity',
        name: 'Tiện ích chung',
        selectionMode: 'multiple',
        isActive: true,
        tags: [
            activeTag('parking', 'Có chỗ đỗ xe'),
            activeTag('wifi', 'Có Wi-Fi'),
            activeTag('air_conditioning', 'Có điều hòa'),
            activeTag('wheelchair_accessible', 'Hỗ trợ xe lăn'),
            activeTag('restroom', 'Có nhà vệ sinh'),
            activeTag('pet_friendly', 'Cho phép thú cưng'),
        ],
    },
    {
        code: 'activity',
        name: 'Hoạt động',
        selectionMode: 'multiple',
        isActive: true,
        tags: [
            activeTag('sightseeing', 'Tham quan'),
            activeTag('photography', 'Chụp ảnh'),
            activeTag('cultural_experience', 'Trải nghiệm văn hóa'),
            activeTag('outdoor_activity', 'Hoạt động ngoài trời'),
            activeTag('nightlife', 'Hoạt động về đêm'),
        ],
    },
    {
        code: 'food_service',
        name: 'Dịch vụ ẩm thực',
        selectionMode: 'multiple',
        isActive: true,
        tags: [
            activeTag('local_food', 'Ẩm thực địa phương'),
            activeTag('vegetarian_options', 'Có món chay'),
            activeTag('takeaway', 'Có mang đi'),
            activeTag('reservation_available', 'Có đặt chỗ'),
        ],
    },
    {
        code: 'accommodation_amenity',
        name: 'Tiện ích lưu trú',
        selectionMode: 'multiple',
        isActive: true,
        tags: [
            activeTag('breakfast_included', 'Bao gồm bữa sáng'),
            activeTag('swimming_pool', 'Có hồ bơi'),
            activeTag('airport_shuttle', 'Đưa đón sân bay'),
            activeTag('twenty_four_hour_reception', 'Lễ tân 24 giờ'),
        ],
    },
    {
        code: 'price_level',
        name: 'Mức giá',
        selectionMode: 'single',
        isActive: true,
        tags: [
            activeTag('free_entry', 'Miễn phí'),
            activeTag('budget', 'Tiết kiệm'),
            activeTag('mid_range', 'Tầm trung'),
            activeTag('premium', 'Cao cấp'),
        ],
    },
];
