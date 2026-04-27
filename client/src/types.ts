export type GenderOption = "mulher" | "homem" | "nao-binario" | "prefiro-nao-dizer";
export type UserRole = "user" | "organizer" | "admin";
export type OrganizerStatus = "none" | "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  email: string;
  displayName: string;
  age: number;
  gender: GenderOption;
  preference: GenderOption | "todos";
  bio: string;
  photoUrl: string;
  photoBase64?: string;
  secondPhotoUrl?: string;
  secondPhotoBase64?: string;
  role: UserRole;
  organizerStatus?: OrganizerStatus;
  organizerApprovedAt?: string;
  reportCount?: number;
  isSuspect?: boolean;
  isBanned?: boolean;
  createdAt?: string;
  updatedAt?: string;
  blockedUserIds?: string[];
};

export type OrganizerRequest = {
  id: string;
  userId: string;
  requesterName: string;
  requesterEmail: string;
  venueName: string;
  city: string;
  notes: string;
  status: Exclude<OrganizerStatus, "none">;
  createdAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type EventItem = {
  id: string;
  name: string;
  venueName: string;
  description: string;
  startsAt: string;
  endsAt: string;
  code: string;
  isActive: boolean;
  checkInEnabled?: boolean;
  coverImage?: string;
  ownerId: string;
  entryPath?: string;
  entryUrl?: string;
  qrPayload?: string;
};

export type EventParticipant = {
  id: string;
  eventId: string;
  userId: string;
  checkedInAt: string;
  visible: boolean;
  profile: Profile;
};

export type Conversation = {
  id: string;
  eventId?: string;
  participants: Record<string, boolean>;
  participantProfiles?: Record<string, Pick<Profile, "displayName" | "photoUrl">>;
  lastMessage?: {
    from: string;
    text: string;
    timestamp: string;
  } | null;
  updatedAt?: string;
  closedAt?: string | null;
};

export type ChatMessage = {
  id: string;
  from: string;
  text: string;
  timestamp: string;
  flagged?: boolean;
};

export type OrganizerMetric = {
  participants: number;
  messages: number;
  reports: number;
};
