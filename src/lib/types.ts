
export interface RoomOverride {
  friendlyName: string;
  description: string;
  imageUrl: string;
}

export interface AdminConfig {
  heroImage?: string;
  amenities?: string[];
  roomOverrides?: Record<string, RoomOverride>;
  contactEmail?: string;
}

export interface Lodge {
  id: string;
  name: string;
  slug?: string;
  category: string;
  region?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  commissionRate?: number;
  bookingId: string;
  imageUrl?: string;
  maxCapacity?: number;
  adminConfig?: AdminConfig;
  updatedAt?: any;
  nightsbridge_id?: string;
  bookingProvider?: 'NightsBridge' | 'ProfitRoom';
}

export interface Property {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  star_rating?: number;
  gps?: any;
  nightsbridge_id?: string;
  bookingProvider?: string;
  updated_at: string;
}

export interface RoomType {
  id: string;
  property_id: string;
  nightsbridge_id?: string;
  name: string;
  images?: string[];
  localImages?: string[];
  localImage?: string;
  max_guests?: number;
  description?: string;
}

export interface Quote {
  id?: string;
  userEmail: string;
  lodgeId?: string;
  lodgeName: string;
  otaPrice: number;
  memberPrice: number;
  impactAmount?: number;
  status: 'Pending' | 'Confirmed';
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
  roomName?: string;
  childrenAges?: number[];
  timestamp: any;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  photoURL?: string;
  facebookHandle?: string;
  isHero: boolean;
  heroTier: number;
  interests?: string[];
  referralSource?: string;
  pledgeAccepted?: boolean;
  joinedAt: any;
}

export interface CompetitorRate {
  id?: string;
  competitor_id: string;
  lodge_name: string;
  check_in_date: string;
  scraped_at: any;
  rate_zar: number;
  room_type: string;
  is_own_property?: boolean;
  is_verified_total?: boolean;
  is_pppn?: boolean;
  lodgeId?: string;
  property_id?: string;
  search_params?: {
    adults: number;
    nights: number;
    is_benchmark: boolean;
  };
}
