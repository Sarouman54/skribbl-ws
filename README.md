# skribbl-ws

Base d'un clone de skribbl.io avec WebSocket (Socket.IO), limitee a la gestion des rooms.

## Structure

```text
server/
 room-manager.ts      # logique metier des rooms (create/join/leave)
 socket-handlers.ts   # gestion des evenements Socket.IO
 server.ts            # bootstrap Express + Socket.IO

src/
 index.html           # structure des ecrans (Lobby, Join, Waiting Room)
 styles.css           # styles UI
 app.js               # logique front (navigation + emissions socket)
```

## Scripts

- `npm install`
- `npm run dev:server`

Le serveur est disponible sur `http://localhost:3000`.
