# Åtelschema

Jaktlagets rullande åtelschema. Webbappen har tre vyer för aktuell vecka, personliga veckor och hela schemat. Den byggs med React, TypeScript och Vite och körs som en statisk webbplats.

Schemat börjar måndag 29 december 2025 med Svenne, som ansvarar för ISO-vecka 1 år 2026 i jaktlagets Word-schema. Word-schemat anger tilldelningar till och med vecka 52. Vecka 53 går till Matte enligt den ordinarie rotationen.

## Kör lokalt

Använd Node.js 24 och npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

`npm run dev` startar utvecklingsservern. Kör `npm run preview` efter bygget för att testa produktionsfilerna i `dist/`.

## Så räknas schemat

All verksamhetskonfiguration finns i [src/schedule.config.ts](src/schedule.config.ts). `scheduleStart` är den första måndagen i schemat och `startPerson` är den första ordinarie ansvariga. Den personen måste finnas i `participants`. Varje ordinarie vecka går turen vidare i listan. Rotationen fortsätter genom årsskiftet, även efter en ISO-vecka 53. Före startdatumet visas inga tilldelningar.

Den aktuella veckan beräknas i tidszonen `Europe/Stockholm`. En vecka löper från måndag till söndag. Årsvyerna visar alla tilldelade veckor som överlappar det valda kalenderåret. En vecka över nyår visas och räknas därför i båda årsvyerna och behåller sitt ISO-veckoår och sitt veckonummer.

Mina veckor sparar senaste valet i webbläsaren och skriver det i adressen när ett namn väljs. Bokmärk eller dela hela adressen. Direktlänkar som `?person=Oscar` öppnar också personvyn. Hela schemat visar vid personfilter både personens tilldelningar och gemensamma veckor. Markera **Visa tidigare veckor** i Mina veckor eller Hela schemat för att se alla tilldelningar under det innevarande året. Avslutade veckor visas i grått och tidigare kalenderår visas direkt.

## Lägg till premiärveckor och uppehåll

Lägg till poster i `specialWeeks`. Exemplen visar de två datumformaten.

```ts
{ year: 2027, week: 40, type: 'everyone', description: 'Jaktpremiär' }
{ date: '2027-10-11', type: 'none', description: 'Uppehåll' }
```

`year` betyder ISO-veckoår och `date` måste vara veckans måndag. Med `everyone` ansvarar alla och med `none` ansvarar ingen. Båda pausar rotationen under veckan. Med `regular` kan en ordinarie vecka få en beskrivning medan turen går vidare som vanligt.

**Behåll alla tidigare specialveckor från rotationsankaret.** Om en historisk paus tas bort eller byter typ kan tilldelningarna efter den veckan ändras. När nästa års schema ska uppdateras, lägg till årets nya specialveckor i befintlig lista och behåll ankaret och tidigare års poster. Kör `npm test` och `npm run build` före push.

## Ändra deltagare eller turordning

Behåll den initiala deltagarlistan, ankaret och alla tidigare ändringar. Lägg till en post i `rotationChanges` för den första måndagen med den nya turordningen. Ange hela den nya listan och välj vem som får den första ordinarie turen från den veckan.

```ts
{
  effectiveFrom: '2028-01-10',
  startPerson: 'Jonis',
  participants: [
    'Jonis', 'Svenne', 'Matte', 'Daniel L', 'Johan',
    'Viktor', 'Oscar', 'Göran', 'Daniel S', 'Benke',
  ],
}
```

Ändringarna ska ligga i stigande datumordning. Om den första veckan är en paus får startpersonen den första ordinarie veckan därefter, så länge den nya listan fortfarande gäller. Välj startpersonen utifrån vem jaktlaget vill ge nästa tur. Tilldelningar före ändringsdatumet räknas enligt de listor som gällde då.

## Kontrollera historiken

[Tester](tests/schedule.test.ts) täcker årsskiften, svensk lokal tid, specialveckor, personurval, validering och daterade ändringar i turordningen. Ett regressionstest använder en fast testkonfiguration med historiska specialveckor och förväntade tilldelningar över flera år. Ett separat test jämför verklig konfiguration med uttryckligt angivna kontrollpunkter.

Lägg till nya kontrollpunkter från kända tilldelningar när schemat uppdateras. Behåll tidigare kontroller och utred ett misslyckat test mot den tidigare konfigurationen innan du ändrar en förväntad tilldelning.

## Publicera på GitHub Pages

1. Lägg projektet i GitHub-repot som ska publicera webbplatsen.
2. Gå till **Settings → Pages → Build and deployment** och välj **GitHub Actions** som källa.
3. Pusha till `main`. [Arbetsflödet](.github/workflows/deploy.yml) installerar beroenden, kör tester och bygger före publicering. En pull request verifieras utan publicering. Adressen visas under **Actions** efter lyckad publicering.

Arbetsflödet hämtar basvägen från GitHub Pages och skickar den till Vite. Det fungerar för både projektsökvägar och sajter på domänens rot. Hashbaserad navigering och personens query-parameter fungerar vid omladdning under båda adresstyperna. Se [Vites guide för GitHub Pages](https://vite.dev/guide/static-deploy#github-pages).

Projektsökvägen kan även provas lokalt:

```sh
PAGES_BASE_PATH=/atelschema npm run build
PAGES_BASE_PATH=/atelschema npm run preview
```

Öppna `http://localhost:4173/atelschema/?person=Oscar`.

## Framtida kalenderexport

Motorn i [src/schedule.ts](src/schedule.ts) kan användas direkt från ett framtida exportskript. Den returnerar veckans måndag, söndag, typ och ansvarig utan att bero på React eller webbläsaren. En export kan använda de ordinarie tilldelningarna för vald person och gemensamma veckor. En stabil UID kan byggas av ett fast kalender-ID, ett beständigt person-ID och veckans måndagsdatum. Kalenderexport ingår inte i den här versionen.
