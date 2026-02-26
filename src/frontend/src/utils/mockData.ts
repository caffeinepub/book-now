import { EventCategory, EventStatus } from "../backend";

export interface MockEvent {
  id: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  venue: string;
  city: string;
  country: string;
  eventDate: bigint;
  description: string;
  coverImage: string;
  tags: string[];
  vendorId: string;
  createdAt: bigint;
  isDemo: true;
  fromPrice: number;
}

export const DEMO_EVENTS: MockEvent[] = [
  {
    id: "demo-1",
    title: "Neon Pulse Music Festival",
    category: EventCategory.concert,
    status: EventStatus.published,
    venue: "Mumbai Arena",
    city: "Mumbai",
    country: "India",
    eventDate: BigInt(Date.now() + 7 * 24 * 60 * 60 * 1000) * 1000000n,
    description:
      "The biggest electronic music festival of the year featuring 50+ international DJs across 5 stages. Experience cutting-edge light shows and immersive art installations.",
    coverImage: "",
    tags: ["EDM", "Festival", "Electronic"],
    vendorId: "demo-vendor",
    createdAt: BigInt(Date.now()) * 1000000n,
    isDemo: true,
    fromPrice: 49,
  },
  {
    id: "demo-2",
    title: "IPL Finals 2026",
    category: EventCategory.sports,
    status: EventStatus.published,
    venue: "Wankhede Stadium",
    city: "Mumbai",
    country: "India",
    eventDate: BigInt(Date.now() + 14 * 24 * 60 * 60 * 1000) * 1000000n,
    description:
      "Witness the ultimate cricket showdown at the iconic Wankhede Stadium. The biggest IPL season finale with world-class players competing for the championship title.",
    coverImage: "",
    tags: ["Cricket", "IPL", "Sports"],
    vendorId: "demo-vendor",
    createdAt: BigInt(Date.now()) * 1000000n,
    isDemo: true,
    fromPrice: 25,
  },
  {
    id: "demo-3",
    title: "Web3 Global Summit 2026",
    category: EventCategory.conference,
    status: EventStatus.published,
    venue: "Marina Bay Sands",
    city: "Singapore",
    country: "Singapore",
    eventDate: BigInt(Date.now() + 21 * 24 * 60 * 60 * 1000) * 1000000n,
    description:
      "Join 10,000+ blockchain innovators, DeFi pioneers, and Web3 builders at the world's largest decentralized technology conference. Three days of keynotes, workshops, and networking.",
    coverImage: "",
    tags: ["Web3", "Blockchain", "Tech"],
    vendorId: "demo-vendor",
    createdAt: BigInt(Date.now()) * 1000000n,
    isDemo: true,
    fromPrice: 299,
  },
  {
    id: "demo-4",
    title: "Champions League Final",
    category: EventCategory.sports,
    status: EventStatus.published,
    venue: "Allianz Arena",
    city: "Munich",
    country: "Germany",
    eventDate: BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000000n,
    description:
      "Europe's most prestigious football tournament reaches its climax. Two continental giants battle for the ultimate prize in a packed 75,000-seat arena.",
    coverImage: "",
    tags: ["Football", "UEFA", "Champions League"],
    vendorId: "demo-vendor",
    createdAt: BigInt(Date.now()) * 1000000n,
    isDemo: true,
    fromPrice: 150,
  },
  {
    id: "demo-5",
    title: "AI & Future of Work Masterclass",
    category: EventCategory.workshop,
    status: EventStatus.published,
    venue: "DIFC Innovation Hub",
    city: "Dubai",
    country: "UAE",
    eventDate: BigInt(Date.now() + 10 * 24 * 60 * 60 * 1000) * 1000000n,
    description:
      "Intensive 2-day masterclass on leveraging artificial intelligence for business transformation. Learn from Fortune 500 executives and leading AI researchers.",
    coverImage: "",
    tags: ["AI", "Workshop", "Business"],
    vendorId: "demo-vendor",
    createdAt: BigInt(Date.now()) * 1000000n,
    isDemo: true,
    fromPrice: 499,
  },
  {
    id: "demo-6",
    title: "Grand Gala — Black Tie Evening",
    category: EventCategory.privateEvent,
    status: EventStatus.published,
    venue: "The Savoy",
    city: "London",
    country: "UK",
    eventDate: BigInt(Date.now() + 45 * 24 * 60 * 60 * 1000) * 1000000n,
    description:
      "An exclusive black-tie gala at London's legendary Savoy hotel. Live orchestra, celebrity guests, 5-course Michelin-star dinner, and charity auction.",
    coverImage: "",
    tags: ["Gala", "Exclusive", "Charity"],
    vendorId: "demo-vendor",
    createdAt: BigInt(Date.now()) * 1000000n,
    isDemo: true,
    fromPrice: 750,
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  concert: "badge-concert",
  sports: "badge-sports",
  conference: "badge-conference",
  workshop: "badge-workshop",
  privateEvent: "badge-private",
};

export const CATEGORY_LABELS: Record<string, string> = {
  concert: "Concert",
  sports: "Sports",
  conference: "Conference",
  workshop: "Workshop",
  privateEvent: "Private Event",
};

export const CATEGORY_GRADIENTS: Record<string, string> = {
  concert: "from-purple-900/80 via-purple-800/60 to-indigo-900/80",
  sports: "from-green-900/80 via-emerald-800/60 to-teal-900/80",
  conference: "from-blue-900/80 via-blue-800/60 to-cyan-900/80",
  workshop: "from-amber-900/80 via-orange-800/60 to-yellow-900/80",
  privateEvent: "from-pink-900/80 via-rose-800/60 to-red-900/80",
};
