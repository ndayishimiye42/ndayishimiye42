# Umuryango Chat — Private Chat Rooms (8 members max)

## Ibisabwa
- Node.js 18 cyangwa iyisumba
- Internet ku gihe cyo gushyiraho dependencies

## Gutangiza kuri mudasobwa yawe
1. Fungura terminal muri folder ya project.
2. Koresha `npm install`
3. Koresha `npm start`
4. Fungura `http://localhost:3000` muri browser.

## Uko ikoreshwa
- Umuntu umwe akora icyumba, agashyiraho izina, username na password.
- Asangiza abandi room code na password.
- Abandi bakoresha code na password kugira ngo binjire.
- Buri cyumba cyemera abantu 8 gusa.
- Abagize icyumba bashobora gukora groups/uturwi no kwinjira mu yindi group.
- Ubutumwa bw'icyumba n'uturwi butangwa ako kanya hakoreshejwe Socket.IO.

## Icyitonderwa cy'ingenzi
Iyi ni MVP yo kugerageza. Rooms, passwords n'ubutumwa bibikwa mu memory ya server, bityo birasibangana iyo server yongeye gutangira. Passwords ntizirabikwa muri database cyangwa ngo zibe hashed. Nta konti z'abakoresha zifite authentication nyayo irimo. Mbere yo kuyishyira kuri internet ikoreshwa n'abantu benshi, ongeramo database, hashed passwords, HTTPS, rate limiting, moderation/reporting, n'uburyo bwo gucunga room owner.

## Kuyishyira online
Deploy kuri service ishyigikira Node.js na WebSockets (urugero Render, Railway cyangwa VPS). Set `PORT` environment variable niba platform ibisaba. Koresha HTTPS kandi ntugasangize abantu password y'icyumba ku mugaragaro.
