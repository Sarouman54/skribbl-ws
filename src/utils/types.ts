export type Player = {
  id: string;
  username: string;
};

export type PublicRoomState = {
  roomId: string;
  ownerId: string;
  ownerUsername: string;
  players: Player[];
};

export type PublicRoomSummary = {
  roomId: string;
  ownerUsername: string;
  playerCount: number;
};
