/* =====================================================================
   KONFIGURACJA SERWERA (Supabase)  —  JEDYNY PLIK, KTÓRY WYPEŁNIASZ
   ---------------------------------------------------------------------
   Gdzie to znaleźć:
     supabase.com → Twój projekt → Settings (⚙) → API
       • "Project URL"          → wklej do  url
       • "anon public"  (klucz) → wklej do  anonKey

   Klucz "anon public" jest przeznaczony do publikowania w kodzie strony —
   to NIE jest hasło. Dostępu do danych pilnują reguły RLS z pliku schema.sql.
   NIGDY nie wklejaj tu klucza "service_role".

   Dopóki te pola są puste, aplikacja działa tak jak wcześniej:
   w pełni offline, bez logowania, postęp tylko na tym urządzeniu.
   ===================================================================== */
window.CLOUD_CONFIG = {

  url:     "https://czirgsryfsjmcamkqwdp.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aXJnc3J5ZnNqbWNhbWtxd2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MzQyMjQsImV4cCI6MjEwODQxMDIyNH0.zb3saM7KJGkHIQk-NpW31g6hik8cTGyJl-fUXjEXPHc",

  // Przycisk „Zaloguj przez Google”.
  // Ustaw na false, jeżeli nie skonfigurowałeś logowania Google
  // (Supabase → Authentication → Providers → Google).
  google: true,

  // Nazwa działu, do którego wpadają pytania innych użytkowników.
  publicCategory: "🌍 Pytania społeczności",

  // Nazwa działu z Twoimi własnymi pytaniami.
  myCategory: "✍️ Moje pytania"
};
