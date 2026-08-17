export type User = {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
    postalCode?: string;
    interestIds?: string[];
    dateOfBirth?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    address?: string;
    homeLocation?: { type: "Point"; coordinates: [number, number] };
};

export type Interest = { _id: string; name: string; icon?: string };

export type ResolvedAddress = {
    address: string;
    postalCode: string;
    state: string;
    location: { lat: number; lng: number };
};

export type Broadcast = {
    _id: string;
    title?: string;
    message: string;
    originAddress?: string;
    destinationAddress?: string;
    destinationLocation?: { lat: number; lng: number };
    destinationToBeDecided?: boolean;
    eventDate: string;
    state: string;
    postalCode: string;
    maxParticipants: number;
    participantCount: number;
    status: "ACTIVE" | "FULL" | "EXPIRED" | "CANCELLED" | "CLOSED";
    recipientId?: string;
    recipientStatus?: "PENDING" | "ACCEPTED" | "PASSED" | "EXPIRED" | "CLOSED" | "EXCLUDED" | "LEFT" | "REMOVED" | "APPLIED";
    respondedAt?: string;
    creatorId?: User | string;
    interestIds?: Interest[] | string[];
    imageUrls?: string[];
    coverImageUrl?: string | null;
    imageMedia?: { key: string; url: string }[];
    highlightVideoUrl?: string | null;
    introVideoUrl?: string | null;
};

export type ChatRoom = {
    _id: string;
    broadcastId?: {
        _id: string;
        title?: string;
        coverImageUrl?: string | null;
    } | string;
    participantIds: string[];
    messageCount: number;
    unreadCount?: number;
    lastMessageAt?: string;
    disabled?: boolean;
};
export type ChatMessage = {
    _id: string;
    senderId: string;
    senderName?: string;
    content: string;
    createdAt: string;
};

export type Notification = {
    _id: string;
    type: string;
    data: Record<string, unknown>;
    read: boolean;
    createdAt: string;
};

export type Paginated<T> = {
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
};

export type BroadcastParticipant = {
    _id: string;
    userId: User | string;
    status: "PENDING" | "ACCEPTED" | "PASSED" | "EXPIRED" | "CLOSED" | "EXCLUDED" | "LEFT" | "REMOVED" | "REJECTED";
    respondedAt?: string;
};

export type UserProfile = {
    user: User;
    attendedEvents: Broadcast[];
    rating: { average: number; count: number };
};

export type Rating = {
    _id?: string;
    raterId: string;
    ratedUserId?: string;
    broadcastId: string;
    score: number;
};

export type RatingParticipant = {
    _id: string;
    userId: User;
};

export type BroadcastRatingContext = {
    broadcast: Broadcast;
    participants: RatingParticipant[];
    ratings: Rating[];
    broadcastRating?: Rating | null;
};

export type ProfileEventsPage = {
    data: Broadcast[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export type FeedMedia = { key: string; url: string; mediaType: "image" | "video"; likeCount: number; likedByUser: boolean };
export type FeedBroadcast = Broadcast & { media: FeedMedia[]; audienceGender?: "ANY" | "MALE" | "FEMALE" | "OTHER"; applicationStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | null; isCreator?: boolean; canApply?: boolean };