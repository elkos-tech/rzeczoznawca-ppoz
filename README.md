# Rzeczoznawca PPOŻ – aplikacja do nauki

Aplikacja do nauki do egzaminu na **rzeczoznawcę do spraw zabezpieczeń przeciwpożarowych**.
Wersja: **PWA** (Progressive Web App) – działa na komputerze i na telefonie z Androidem,
offline, można ją zainstalować na ekranie głównym. Jeden kod dla wszystkich urządzeń.

## Co zawiera

- **560 pytań** z części pisemnych egzaminów (oficjalny dokument KG PSP, lata 2015–2026).
- Automatyczny podział na **14 działów tematycznych**.
- **Tryb nauki** – przeglądanie pytań z odpowiedzią, objaśnieniem i przypisem prawnym.
- **Egzamin próbny** – 40 pytań / 40 min, punktacja wg zasad egzaminu (poprawna +1, błędna −1,
  próg zaliczenia 21 pkt), timer, przegląd odpowiedzi.
- **Kategorie / działy** – nauka tematami.
- **Powtórki** – system Leitnera (pytania błędne/trudne wracają wg harmonogramu).
- **Statystyki** – postęp i skuteczność w podziale na działy.
- Tryb jasny/ciemny, postęp zapisywany lokalnie (localStorage).
- **Akty prawne (offline)** – 16 ustaw i rozporządzeń dołączonych jako pliki **PDF** w folderze
  `akty/` (teksty jednolite/oficjalne z dziennikustaw.gov.pl / api.sejm.gov.pl). Ekran „Akty prawne"
  i każdy przypis w objaśnieniu linkują do dołączonego PDF (działa bez internetu), a dodatkowo do
  ISAP (tekst online). Normy PN/PKN (płatne) nie mogą być dołączone – linkują do katalogu PKN.
  Rejestr aktów i linkowanie: plik `acts.js`. Lista pobranych aktów: WT, ustawa o ochronie ppoż.,
  rozp. ppoż. budynków, rozp. o wodzie i drogach pożarowych, uzgadnianie projektu, odpady (rozp.
  i ustawa), paliwa, sieci gazowe, metro, drogowe obiekty inżynierskie, budowle rolnicze, MEN
  (przedszkola), cyberbezpieczeństwo, wyroby budowlane, Prawo budowlane.

## Ważne zastrzeżenie

Oficjalny dokument KG PSP zawiera **wyłącznie treści pytań – bez klucza odpowiedzi**.
Odpowiedzi, objaśnienia i przypisy prawne są **opracowaniem pomocniczym**:

- **✔ zweryfikowane** – potwierdzone wprost w treści aktu prawnego,
- **△ do weryfikacji** – propozycja odpowiedzi z podanym miejscem w przepisie do sprawdzenia.

Klucz odpowiedzi jest **kompletny — wszystkie 560 pytań** mają odpowiedź, objaśnienie i przypis
prawny. Z tego ok. 33 pytania oznaczono jako „✔ zweryfikowane" (potwierdzone wprost w przepisie
lub oparte na obliczeniu), a pozostałe jako „△ do weryfikacji" — to najlepsza odpowiedź z podanym
miejscem w akcie do samodzielnego sprawdzenia. **Zawsze weryfikuj z aktualnym stanem prawnym.**

## Nowe pytania (autorskie) i projekt nowych WT

Poza oficjalnym zestawem 560 pytań dodano **24 pytania autorskie** (plik `questions-new.js`),
oznaczone w aplikacji plakietką **★ NOWE**:

- **12 pytań z PROJEKTU nowych WT** (projekt rozporządzenia MRiT z 9.06.2025 r., dołączony jako
  `akty/wt-projekt.pdf`) — głównie z zupełnie nowych rozdziałów: **instalacje fotowoltaiczne**
  (§ 303–309) i **magazyny energii** (§ 310–312). Odpowiedzi zacytowane wprost z treści projektu.
  Nowy dział tematyczny: „Fotowoltaika i magazyny energii".
- **12 pytań z aktów obowiązujących** (WT, RPB, RW, normy), ułożonych w stylu pytań z lat ubiegłych —
  w tym zadania obliczeniowe (przejścia ewakuacyjne, szerokości drzwi, zapas wody).

⚠️ Projekt WT to **akt nieobowiązujący** — służy do zapoznania się ze zmianami, nie jest podstawą
prawną. Aplikacja wyraźnie to oznacza przy każdym pytaniu i w wykazie aktów.

Nowe pytania można uczyć/testować osobno: w trybie nauki i w egzaminie wybierz dział
**„★ Tylko nowe pytania"**.

## Cytaty z przepisów w objaśnieniach

Pod każdym objaśnieniem wyświetlany jest **dosłowny cytat przepisu**, na podstawie którego
opracowano odpowiedź — wyciągnięty automatycznie z dołączonych PDF-ów aktów (`quotes.js`,
generowany skryptem `answers_data/build_quotes.py`). Układ objaśnienia:

1. **Objaśnienie** – wyjaśnienie, dlaczego odpowiedź jest poprawna,
2. **Cytat z przepisu** – oryginalne brzmienie § / art. (z odnośnikiem do PDF aktu),
3. **Podstawa prawna** – link do dołączonego dokumentu.

Statystyki: **293 dosłowne cytaty** z aktów, **488 z 584 pytań** ma blok cytatu.
Dla Polskich Norm (PN/PKN) cytat **nie jest przytaczany** — to dokumenty płatne, objęte prawami
PKN; aplikacja wyświetla w tym miejscu stosowną informację.

### Audyt: czy cytat potwierdza odpowiedź

Skrypt `answers_data/check_quotes.js` porównuje wartości z zaznaczonej odpowiedzi z treścią
cytatu i zgłasza pytania, w których cytat wskazuje inny wariant:

```bash
node answers_data/check_quotes.js
```

Pierwszy audyt (10.2026) wykrył i poprawił **27 błędnych odpowiedzi**. Pozostałe zgłoszenia to
fałszywe alarmy (odpowiedzi obliczeniowe, gdzie cytat podaje wartość bazową). Do wyszukiwania
przepisu po słowach kluczowych służy `answers_data/find.py <akt> <słowa>`.

Regeneracja cytatów po zmianie odpowiedzi lub dodaniu aktu:

```bash
python answers_data/build_quotes.py
```

Skrypt sam naprawia kodowanie starych PDF-ów Dz.U. (sprzed 2012 r.) i dobiera fragment paragrafu
najlepiej pasujący do treści objaśnienia.

## Wersja serwerowa: konta, synchronizacja, własne pytania

Aplikację można postawić na darmowym hostingu i wtedy dochodzą trzy rzeczy:

- **Konto użytkownika** (e-mail + hasło albo Google) — jeden postęp nauki na telefonie
  i komputerze. Bez logowania aplikacja działa jak wcześniej, w pełni offline.
- **Własne pytania** — ekran „✍️ Moje pytania" z edytorem (treść, trzy odpowiedzi,
  poprawna, objaśnienie, podstawa prawna, dział). Pytanie może być **prywatne**
  (widzi je tylko autor) albo zgłoszone jako **publiczne**.
- **Moderacja** — pytanie publiczne pojawia się u innych dopiero po zatwierdzeniu przez
  administratora (ekran „🛡️ Do zatwierdzenia", widoczny tylko dla konta admina).
  Przy odrzuceniu autor dostaje uwagę moderatora. Edycja zatwierdzonego pytania
  zrzuca je z powrotem do kolejki.

Pytania z serwera trafiają do nauki i egzaminu jako dwa dodatkowe działy:
**„✍️ Moje pytania"** i **„🌍 Pytania społeczności"**, i są wyraźnie oznaczone
plakietką ✍️ UŻYTKOWNIKA (z pseudonimem autora).

Konta i dane obsługuje **Supabase** (darmowy plan), pliki aplikacji leżą na
**GitHub Pages** (darmowe). Nie trzeba pisać ani utrzymywać żadnego serwera.
Dostęp do danych pilnują reguły RLS w samej bazie — pytanie prywatne i postęp nauki
nie opuszczają serwera, nawet gdyby ktoś zmodyfikował kod strony.

➡️ **Instrukcja krok po kroku: [README-SERWER.md](README-SERWER.md)** (ok. 30 min, 0 zł) —
albo jako strona do odhaczania kroków w przeglądarce: **`instrukcja-serwer.html`**.
Konfiguracja aplikacji to jeden plik — `cloud-config.js` (adres projektu + klucz publiczny).
Struktura bazy: `schema.sql` (wklejane raz w panelu Supabase).

Dopóki `cloud-config.js` jest pusty, aplikacja w ogóle nie próbuje się łączyć z siecią
i nie pokazuje przycisku konta.

## Jak uruchomić na komputerze

Service worker (tryb offline) wymaga serwera HTTP. Najprościej:

1. **Najprościej: kliknij dwukrotnie `Uruchom TEST.bat`** — sam znajdzie Pythona, wystartuje
   serwer i otworzy od razu **egzamin próbny**. Zamykasz dowolnym klawiszem w oknie konsoli.
   Jeśli Pythona nie ma, otworzy aplikację bezpośrednio z pliku (tryb awaryjny).
   Skróty adresowe: `#egzamin`, `#nowe`, `#nauka`, `#akty`, `#konto`, `#moje`.
2. Alternatywnie `start.bat` (pełna aplikacja od ekranu głównego), albo ręcznie w tym folderze:
   ```
   python -m http.server 8777
   ```
   i otwórz `http://127.0.0.1:8777/index.html`.

Uwaga: samo dwukrotne otwarcie `index.html` (file://) też zadziała do nauki i egzaminu,
ale bez instalacji jako PWA i bez pełnego trybu offline.

## Jak zainstalować na Androidzie

1. Umieść cały folder na serwerze WWW dostępnym przez HTTPS (np. GitHub Pages, dowolny hosting,
   albo serwer w sieci lokalnej), lub uruchom `start.bat` na komputerze w tej samej sieci Wi‑Fi
   i wejdź z telefonu na `http://ADRES-IP-KOMPUTERA:8777`.
2. W przeglądarce Chrome na telefonie otwórz adres aplikacji.
3. Menu (⋮) → **„Dodaj do ekranu głównego” / „Zainstaluj aplikację”**.
4. Aplikacja pojawi się jak zwykła apka, działa offline.

> HTTPS jest wymagany do pełnej instalacji PWA (poza `localhost`). Na `http://` w sieci lokalnej
> aplikacja też działa, ale instalowalność zależy od przeglądarki.

## Jak dodać / poprawić odpowiedzi

Edytuj plik **`answers.js`**. Każdy wpis to:

```js
33: {
  answer: "c",                       // a | b | c
  explanation: "Wyjaśnienie...",
  legal: ["§ 237 WT – ..."],        // przypisy prawne (można kilka)
  verified: true                     // true = potwierdzone w przepisie
},
```

Numer (`33`) to `id` pytania widoczne w aplikacji. Pytania bez wpisu pokazują się w trybie
nauki z komunikatem „objaśnienie w przygotowaniu” i nie są losowane do egzaminu.

Jeśli chcesz, wygenerowanie kolejnych partii odpowiedzi można zlecić dalej – najlepiej z
weryfikacją w tekstach aktów prawnych.

## Pliki

| Plik | Opis |
|------|------|
| `index.html` | strona główna |
| `app.js` | logika aplikacji |
| `styles.css` | wygląd |
| `questions.js` | baza 560 pytań (treść + warianty + kategoria) |
| `answers.js` | klucz odpowiedzi + objaśnienia + przypisy prawne |
| `questions-new.js` | 24 pytania autorskie (★ NOWE) |
| `acts.js`, `quotes.js` | rejestr aktów prawnych i dosłowne cytaty przepisów |
| `akty/` | 17 aktów prawnych w PDF (tryb offline) |
| `manifest.webmanifest`, `service-worker.js`, `icons/` | pliki PWA (instalacja, offline) |
| `cloud-config.js` | **konfiguracja serwera** — adres projektu Supabase + klucz publiczny |
| `cloud.js`, `vendor/supabase.js` | logowanie, synchronizacja postępu, pytania użytkowników |
| `schema.sql` | struktura bazy do wklejenia w panelu Supabase |
| `README-SERWER.md` | instrukcja publikacji na serwerze |
| `instrukcja-serwer.html` | ta sama instrukcja jako strona w przeglądarce (lista kroków do odhaczania) |
| `zrodlo_pytan_KGPSP_2015-2026.pdf` | oryginalny dokument źródłowy KG PSP |

## Źródło pytań

Komenda Główna PSP – „Treści pytań egzaminacyjnych z części pisemnych egzaminów… 2015–2026”
(gov.pl/web/kgpsp/egzamin-na-rzeczoznawce-ds-zabezpieczen-przeciwpozarowych).

## Podstawowe akty prawne

- Ustawa z 24.08.1991 r. o ochronie przeciwpożarowej (t.j. Dz.U. 2025 poz. 188)
- Ustawa z 7.07.1994 r. – Prawo budowlane
- Rozp. MI z 12.04.2002 r. – warunki techniczne, jakim powinny odpowiadać budynki (WT)
- Rozp. MSWiA z 7.06.2010 r. – ochrona ppoż. budynków i terenów
- Rozp. MSWiA z 24.07.2009 r. – przeciwpożarowe zaopatrzenie w wodę oraz drogi pożarowe
- Rozp. MSWiA z 2.12.2015 r. – egzamin na rzeczoznawcę (Dz.U. 2015 poz. 2083)
