# Uruchomienie aplikacji na serwerze — instrukcja

> 💡 Wygodniejsza wersja tej instrukcji: **`instrukcja-serwer.html`** — otwórz dwuklikiem
> w Chrome. Odhaczasz zrobione kroki (zapamiętuje je), wpisujesz raz swoją nazwę GitHub
> i identyfikator projektu Supabase, a strona sama wstawia Twoje adresy we wszystkie
> komendy, z przyciskami „Kopiuj".

Aplikacja jest **statyczna** (HTML + JS + PDF-y), więc nie wymaga żadnego serwera z Pythonem,
PHP ani Node.js. Konta użytkowników i bazę pytań obsługuje gotowa usługa **Supabase**.

```
┌──────────────────────────┐        ┌──────────────────────────────┐
│  GitHub Pages (darmowe)  │        │     Supabase (darmowe)       │
│  ────────────────────    │        │  ──────────────────────      │
│  index.html, app.js      │ ─────► │  logowanie (e-mail, Google)  │
│  questions.js, akty/*.pdf│  HTTPS │  profile użytkowników        │
│  = pliki do pobrania     │        │  postęp nauki                │
│                          │        │  pytania użytkowników        │
└──────────────────────────┘        └──────────────────────────────┘
        pliki aplikacji                     dane i konta
```

Łącznie: **0 zł**, bez karty kredytowej, bez utrzymywania serwera.

Całość to dwie części — robi się je raz, w sumie ok. 30–40 minut:

- **CZĘŚĆ A** — baza i konta (Supabase)
- **CZĘŚĆ B** — publikacja plików (GitHub Pages)

---

## CZĘŚĆ A — Supabase (konta, profile, pytania)

### A1. Utwórz projekt

1. Wejdź na **https://supabase.com** → *Start your project* → zaloguj się
   (najprościej kontem GitHub — przyda się w części B).
2. *New project*:
   - **Name:** `rzeczoznawca-ppoz`
   - **Database Password:** wygeneruj i **zapisz w menedżerze haseł**
     (to hasło do samej bazy — w aplikacji nie będzie potrzebne, ale bez niego
     nie zrobisz niektórych operacji administracyjnych)
   - **Region:** `Central EU (Frankfurt)` — najbliżej Polski
   - **Plan:** Free
3. Projekt tworzy się ok. 2 minut.

### A2. Wgraj strukturę bazy

1. W menu po lewej: **SQL Editor** → *New query*.
2. Otwórz plik **`schema.sql`** z folderu aplikacji, skopiuj **całą** treść i wklej do okna.
3. Kliknij **Run** (albo `Ctrl + Enter`).
4. Powinno pojawić się `Success. No rows returned` — to prawidłowy wynik.

Utworzyły się tabele `profiles`, `admins`, `progress`, `questions` wraz z regułami
bezpieczeństwa (RLS). Od tej chwili baza sama pilnuje, kto co widzi — pytanie prywatne
nie opuści serwera, nawet gdyby ktoś przerobił kod strony w przeglądarce.

### A3. Skopiuj adres i klucz do aplikacji

1. W Supabase: **Settings** (⚙ na dole) → **API Keys** (lub **API**).
2. Skopiuj dwie wartości:
   - **Project URL** — np. `https://abcdefghijklmnop.supabase.co`
   - **anon public** — długi klucz zaczynający się od `eyJ...`
3. Otwórz plik **`cloud-config.js`** w folderze aplikacji (Notatnikiem wystarczy) i wklej:

```js
window.CLOUD_CONFIG = {
  url:     "https://abcdefghijklmnop.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...",
  google: true,
  ...
};
```

> **Czy klucz `anon public` można publikować?** Tak — jest do tego przeznaczony,
> trafia do kodu każdej strony korzystającej z Supabase. To nie hasło: sam z siebie
> nie daje dostępu do danych, bo wszystko filtrują reguły RLS.
> **Nigdy nie wklejaj tu klucza `service_role`** — ten omija wszystkie reguły.

### A4. Ustaw adresy powrotu

Bez tego linki z e-maili (potwierdzenie konta, reset hasła) i logowanie Google
będą odsyłać w złe miejsce.

**Authentication** → **URL Configuration**:

- **Site URL:** `https://TWOJA-NAZWA.github.io/rzeczoznawca-ppoz/`
- **Redirect URLs** → *Add URL*: `https://TWOJA-NAZWA.github.io/rzeczoznawca-ppoz/**`
  (gwiazdki na końcu są istotne)

Adres poznasz dopiero w części B — możesz wrócić tu później.
Na czas testów na komputerze dodaj dodatkowo `http://localhost:8777/**`.

### A5. Potwierdzanie adresu e-mail — decyzja

**Authentication** → **Providers** (lub *Sign In / Providers*) → **Email**:

| Ustawienie `Confirm email` | Skutek |
|---|---|
| **włączone** (domyślnie) | Po rejestracji trzeba kliknąć link z e-maila. Bezpieczniejsze. |
| **wyłączone** | Rejestracja działa natychmiast. Wygodniejsze dla siebie i znajomych. |

⚠️ Darmowy plan Supabase wysyła tylko **kilka e-maili na godzinę** (to usługa testowa).
Jeśli aplikacja ma być dla kilkunastu osób, albo **wyłącz potwierdzanie**, albo wpisz
własny serwer SMTP (*Settings → Authentication → SMTP Settings*; darmowy Brevo czy
Resend wystarczy).

### A6. Logowanie przez Google (opcjonalne)

Jeśli nie chcesz Google — ustaw `google: false` w `cloud-config.js` i pomiń ten punkt.

1. **https://console.cloud.google.com** → utwórz projekt (dowolna nazwa).
2. **APIs & Services → OAuth consent screen**: typ **External**, podaj nazwę aplikacji
   i swój e-mail kontaktowy, zapisz.
3. **APIs & Services → Credentials** → *Create credentials* → **OAuth client ID**:
   - **Application type:** `Web application`
   - **Authorized JavaScript origins:** `https://TWOJA-NAZWA.github.io`
   - **Authorized redirect URIs:**
     `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
     ← adres **Twojego projektu Supabase** z punktu A3, z dopiskiem `/auth/v1/callback`
4. Skopiuj **Client ID** i **Client Secret**.
5. Supabase → **Authentication → Providers → Google** → *Enable*, wklej oba pola → **Save**.

### A7. Nadaj sobie prawa administratora

Administrator zatwierdza pytania zgłoszone jako publiczne. Trzeba to zrobić
**po** zarejestrowaniu swojego konta w aplikacji (część B).

Supabase → **SQL Editor** → wklej i uruchom (podmień e-mail na swój):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'lukasz.kosek@op.pl'
on conflict (user_id) do nothing;
```

Po odświeżeniu aplikacji w menu pojawi się kafelek **🛡️ Do zatwierdzenia**.

---

## CZĘŚĆ B — GitHub Pages (publikacja plików)

### B1. Utwórz repozytorium

1. **https://github.com** → zaloguj się → **+** (prawy górny róg) → *New repository*.
2. **Repository name:** `rzeczoznawca-ppoz`
3. **Public** (GitHub Pages dla repozytoriów prywatnych wymaga planu płatnego).
4. *Create repository*.

### B2. Wgraj pliki

Najprościej przez przeglądarkę:

1. Na stronie repozytorium: **Add file → Upload files**.
2. Przeciągnij **całą zawartość** folderu `RzeczoznawcaPPOZ` (pliki i foldery `akty/`,
   `icons/`, `vendor/`).
3. Przewiń w dół → *Commit changes*.

Co wgrywać, a co można pominąć:

| Potrzebne na serwerze | Można pominąć |
|---|---|
| `index.html`, `app.js`, `styles.css` | `answers_data/` (robocze skrypty) |
| `questions.js`, `answers.js`, `questions-new.js` | `zrodlo_pytan_KGPSP_2015-2026.pdf` (1,8 MB, tylko źródło) |
| `acts.js`, `quotes.js` | `Uruchom TEST.bat`, `start.bat` (tylko dla Windows) |
| `cloud-config.js`, `cloud.js`, `vendor/supabase.js` | `README-SERWER.md`, `schema.sql` (ale nie szkodzą) |
| `manifest.webmanifest`, `service-worker.js`, `icons/` | |
| `akty/` (17 PDF-ów, ~17 MB) | |
| `.nojekyll` ← **ważne**, bez tego GitHub może pominąć niektóre pliki | |

> Jeśli przeglądarka nie radzi sobie z 17 MB naraz, wgraj pliki w dwóch turach:
> najpierw wszystko oprócz `akty/`, potem sam folder `akty/`.

### B3. Włącz GitHub Pages

1. W repozytorium: **Settings** → **Pages** (menu po lewej).
2. **Source:** `Deploy from a branch`
3. **Branch:** `main`, folder `/ (root)` → **Save**.
4. Po 1–2 minutach u góry pojawi się adres:

```
https://TWOJA-NAZWA.github.io/rzeczoznawca-ppoz/
```

### B4. Domknij konfigurację

1. Wróć do **A4** i wpisz ten adres w Supabase (*Site URL* i *Redirect URLs*).
2. Jeśli używasz Google — uzupełnij **A6** punkt 3 tym samym adresem.
3. Otwórz aplikację, zarejestruj konto, a potem wykonaj **A7** (prawa administratora).

### B5. Zainstaluj na Androidzie

1. Otwórz adres w **Chrome** na telefonie.
2. Menu (⋮) → **Zainstaluj aplikację** / *Dodaj do ekranu głównego*.
3. Aplikacja uruchamia się jak zwykła apka, pełnoekranowo, i **działa bez internetu**
   (pytania, objaśnienia i PDF-y aktów są zapisane w telefonie).

Logowanie i synchronizacja wymagają oczywiście połączenia — bez niego aplikacja
działa dalej, tylko postęp zapisuje lokalnie i wyśle go przy następnym połączeniu.

---

## Aktualizacja aplikacji

Po zmianie pytań albo odpowiedzi: **Add file → Upload files** → wgraj zmienione pliki →
*Commit changes*. Po ok. minucie zmiany są u wszystkich.

Service worker ma teraz strategię **„najpierw sieć"** dla kodu aplikacji, więc
**nie trzeba już czyścić pamięci przeglądarki** (`Ctrl + Shift + R`) po każdej zmianie —
to był problem wersji lokalnej. PDF-y aktów nadal są brane z pamięci urządzenia;
gdybyś podmienił któryś PDF, podnieś numer wersji w pliku `service-worker.js`:

```js
const CACHE = "rzppoz-v8";   // → "rzppoz-v9"
```

---

## Inne hostingi (alternatywy dla GitHub Pages)

Część A (Supabase) jest wspólna — zmienia się tylko miejsce na pliki.

| Rozwiązanie | Koszt | Zalety | Wady |
|---|---|---|---|
| **GitHub Pages** (wybrane) | 0 zł | HTTPS, prosta aktualizacja, limit 1 GB | repozytorium musi być publiczne |
| **Cloudflare Pages** | 0 zł | najszybszy CDN, repo może być prywatne, drag & drop | konto Cloudflare |
| **Netlify** | 0 zł | wrzucanie folderu myszką, podgląd wersji | limit 100 GB transferu/mies. |
| **Własny hosting / FTP** | masz | pełna kontrola, własna domena | HTTPS trzeba mieć włączony |
| **VPS, np. mikr.us** | ~50 zł/rok | wszystko u siebie | konfiguracja serwera WWW |

Czego **nie** da się zrobić: GitHub Pages i podobne serwują tylko pliki — nie uruchomią
żadnego kodu po stronie serwera. Dlatego konta i baza są w Supabase.

### Limity darmowego planu Supabase

| Zasób | Limit |
|---|---|
| Baza danych | 500 MB (pytania i postępy: tysiące użytkowników zmieszczą się bez problemu) |
| Aktywni użytkownicy / mies. | 50 000 |
| Transfer | 5 GB / mies. |
| Wysyłka e-maili | kilka na godzinę (patrz **A5**) |

⚠️ **Najważniejszy haczyk:** darmowy projekt zostaje **uśpiony po 7 dniach bez ruchu**.
Budzi się jednym kliknięciem w panelu Supabase, ale do tego czasu logowanie nie działa
(aplikacja nadal otworzy się w trybie offline). Jeśli ma działać bez przestojów —
plan Pro to 25 USD/mies. Przy zwykłym korzystaniu raz na kilka dni problem nie wystąpi.

---

## Co się dzieje z danymi użytkowników

Przechowywane są **tylko**:

- adres e-mail i hasło (hasła trzyma i szyfruje Supabase — aplikacja nigdy ich nie widzi),
- pseudonim,
- postęp nauki (które pytania przerobione, statystyki, harmonogram powtórek),
- pytania dodane przez użytkownika.

Reguły RLS z `schema.sql` zapewniają, że:

- postęp nauki widzi **wyłącznie** jego właściciel,
- pytanie prywatne widzi **wyłącznie** autor,
- pytanie publiczne widzą wszyscy zalogowani — ale dopiero **po zatwierdzeniu** przez admina,
- nikt nie nada sobie praw administratora z aplikacji (tabela `admins` nie ma reguły zapisu —
  wpis można dodać tylko z panelu Supabase),
- autor edytujący zatwierdzone pytanie **zrzuca je z powrotem do kolejki moderacji**,
  więc nie da się podmienić treści po akceptacji.

---

## Gdy coś nie działa

| Objaw | Przyczyna i rozwiązanie |
|---|---|
| Kafelek „Konto" pokazuje *Tryb offline — bez konta* | Puste `url` lub `anonKey` w `cloud-config.js`, albo plik nie został wgrany. |
| „Brak połączenia z serwerem" | Projekt Supabase uśpiony (patrz limity) — zaloguj się do panelu i obudź go. |
| „Rejestracja jest wyłączona w panelu Supabase" | *Authentication → Providers → Email* → włącz *Enable sign up*. |
| Po rejestracji nie przychodzi e-mail | Limit wysyłki darmowego planu. Wyłącz *Confirm email* (**A5**) albo ustaw własny SMTP. |
| Link z e-maila prowadzi na `localhost` | Nieustawiony *Site URL* w Supabase — punkt **A4**. |
| „Logowanie Google nie jest włączone" | Punkt **A6** nie został wykonany, albo ustaw `google: false`. |
| Google: `redirect_uri_mismatch` | W Google Cloud brakuje `https://TWÓJ-PROJEKT.supabase.co/auth/v1/callback`. |
| Brak kafelka „Do zatwierdzenia" | Punkt **A7** — i wyloguj się oraz zaloguj ponownie. |
| „Brak uprawnień do tej operacji" | Reguła RLS zadziałała prawidłowo — konto próbuje zrobić coś nie swojego. |
| Strona GitHub Pages pokazuje 404 | Poczekaj 2 minuty po pierwszym wgraniu; sprawdź, czy `index.html` leży w **głównym** katalogu repozytorium. |
| PDF-y aktów się nie otwierają | Folder `akty/` nie został wgrany (17 MB — mógł nie przejść w jednej turze). |

---

## Praca lokalna (bez publikowania)

Do testów na komputerze nadal działa `Uruchom TEST.bat` albo:

```bash
python -m http.server 8777
```

i `http://localhost:8777/index.html`. Pamiętaj tylko, żeby w Supabase (**A4**) dodać
`http://localhost:8777/**` do *Redirect URLs* — inaczej logowanie na localhost odbije.
