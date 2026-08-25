import {
  BankOutlined,
  BuildOutlined,
  CarOutlined,
  CoffeeOutlined,
  CompassOutlined,
  HomeOutlined,
  PictureOutlined,
  ShopOutlined,
  SkinOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons'

const CATEGORY_ICONS = {
  historical_site: BankOutlined,
  religious_site: HomeOutlined,
  museum_cultural: PictureOutlined,
  craft_village: BuildOutlined,
  natural_attraction: CompassOutlined,
  cafe: CoffeeOutlined,
  restaurant: SkinOutlined,
  market_shopping: ShopOutlined,
  hotel: StarOutlined,
  homestay_guesthouse: TeamOutlined,
  entertainment: StarOutlined,
  transport_hub: CarOutlined,
}

export function CategoryIcon({ code, ...props }) {
  const Icon = CATEGORY_ICONS[code] ?? CompassOutlined
  return <Icon {...props} />
}
