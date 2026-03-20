import { io } from 'socket.io-client';
import * as customParser from 'socket.io-msgpack-parser';

export const socket = io({ parser: customParser });
