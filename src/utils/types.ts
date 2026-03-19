export type Player = {
  id: string;
  username: string;
  score: number;
};

export type PublicRoomState = {
  room_id: string;
  host: string;
  players: Player[];
  max_players: number;
  status: string;
  round: number;
  round_time: number;
};

export type PublicRoomSummary = {
  roomId: string;
  ownerUsername: string;
  playerCount: number;
};
