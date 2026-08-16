export type User = {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
    postalCode?: string;
    interestIds?: string[];
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
    status: "ACTIVE" | "FULL" | "EXPIRED" | "CANCELLED";
    recipientId?: string;
    recipientStatus?: "PENDING" | "ACCEPTED" | "PASSED" | "EXPIRED";
    respondedAt?: string;
    creatorId?: User | string;
    interestIds?: Interest[] | string[];
};

export type ChatRoom = {
    _id: string;
    broadcastId?: {
        _id: string;
        title?: string;
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
    status: "PENDING" | "ACCEPTED" | "PASSED" | "EXPIRED";
    respondedAt?: string;
};