export type Player = {
  id: string;
  username: string;
  score: number;
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
