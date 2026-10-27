/* ===== NOWE PYTANIA (spoza oficjalnego zestawu KG PSP 2015–2026) =====
 * Pytania autorskie, ułożone w stylu pytań z poprzednich lat.
 * Dwa źródła:
 *  - "projekt WT 2025" – PROJEKT rozporządzenia MRiT w sprawie warunków technicznych
 *    z 9.06.2025 r. (akt NIEOBOWIĄZUJĄCY – dołączony jako akty/wt-projekt.pdf).
 *    Odpowiedzi zacytowane wprost z treści projektu.
 *  - "akty obowiązujące" – aktualnie obowiązujące przepisy (WT, RPB, RW, normy).
 *
 * Każde pytanie ma isNew:true — aplikacja oznacza je plakietką „NOWE”.
 * Numeracja od 1001, aby nie kolidowała z oficjalnymi pytaniami 1–560.
 */
window.QUESTIONS_NEW = [

/* ---------- A. PROJEKT NOWYCH WT (9.06.2025) – fotowoltaika ---------- */
{
  id: 1001, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem rozporządzenia Ministra Rozwoju i Technologii w sprawie warunków technicznych (projekt z 9.06.2025 r.), urządzenie fotowoltaiczne na dachu budynku instaluje się w sektorze o powierzchni nieprzekraczającej:",
  options: { a: "1000 m² i o rozpiętości nie większej niż 30 m", b: "1600 m² i o rozpiętości nie większej niż 40 m", c: "2500 m² i o rozpiętości nie większej niż 50 m" },
  answer: "b",
  explanation: "Projekt WT wymaga, aby urządzenie fotowoltaiczne na dachu instalować w sektorze o powierzchni nieprzekraczającej 1600 m² i o rozpiętości nie większej niż 40 m — jest to jeden z warunków ograniczenia rozprzestrzeniania pożaru między strefami pożarowymi.",
  legal: ["§ 306 pkt 2 projektu WT (projekt z 9.06.2025 r.) – instalowanie urządzeń fotowoltaicznych na dachu"],
  verified: true
},
{
  id: 1002, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), odległość między sektorami, w których instaluje się urządzenia fotowoltaiczne na dachu budynku, powinna wynosić co najmniej:",
  options: { a: "2,5 m", b: "5 m", c: "8 m" },
  answer: "b",
  explanation: "Projekt WT wymaga zachowania odległości co najmniej 5 m między sektorami urządzeń fotowoltaicznych na dachu (sektory o powierzchni do 1600 m² i rozpiętości do 40 m).",
  legal: ["§ 306 pkt 3 projektu WT (projekt z 9.06.2025 r.)"],
  verified: true
},
{
  id: 1003, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), urządzenie fotowoltaiczne na dachu instaluje się w odległości co najmniej 2,5 m od ściany oddzielenia przeciwpożarowego. Warunku tego nie stosuje się, jeżeli ściana oddzielenia przeciwpożarowego jest wyprowadzona ponad górną krawędź urządzenia fotowoltaicznego na wysokość co najmniej:",
  options: { a: "0,3 m", b: "0,5 m", c: "1,0 m" },
  answer: "a",
  explanation: "Odległość 2,5 m od ściany oddzielenia przeciwpożarowego nie jest wymagana, gdy ściana ta została wyprowadzona ponad górną krawędź urządzenia fotowoltaicznego na wysokość co najmniej 0,3 m.",
  legal: ["§ 306 pkt 4 projektu WT (projekt z 9.06.2025 r.)"],
  verified: true
},
{
  id: 1004, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), urządzenie fotowoltaiczne na dachu budynku instaluje się od urządzeń służących do usuwania dymu w odległości co najmniej:",
  options: { a: "1 m", b: "2 m", c: "5 m" },
  answer: "b",
  explanation: "Projekt WT wymaga zachowania odległości co najmniej 2 m między urządzeniem fotowoltaicznym a urządzeniami służącymi do usuwania dymu (np. klapami dymowymi).",
  legal: ["§ 306 pkt 5 projektu WT (projekt z 9.06.2025 r.)"],
  verified: true
},
{
  id: 1005, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), urządzenie fotowoltaiczne na ścianie zewnętrznej budynku instaluje się na wysokości nie większej niż:",
  options: { a: "12 m od poziomu terenu", b: "25 m od poziomu terenu", c: "35 m od poziomu terenu" },
  answer: "b",
  explanation: "Jednym z łącznych warunków instalowania urządzenia fotowoltaicznego na ścianie zewnętrznej jest umieszczenie go na wysokości nie większej niż 25 m od poziomu terenu (ściana ma mieć co najmniej EI 30, być NRO, a izolacja cieplna klasę inną niż F).",
  legal: ["§ 307 pkt 2 projektu WT (projekt z 9.06.2025 r.)"],
  verified: true
},
{
  id: 1006, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), urządzenia fotowoltaiczne zintegrowane z budynkiem, stanowiące jego ścianę zewnętrzną lub dach, mogą być wykonane na wysokości powyżej 25 m od poziomu terenu, jeżeli budynek jest wyposażony w:",
  options: { a: "system sygnalizacji pożarowej", b: "stałe samoczynne urządzenia gaśnicze wodne", c: "samoczynne urządzenia oddymiające uruchamiane systemem wykrywania dymu" },
  answer: "b",
  explanation: "Co do zasady urządzenia fotowoltaiczne zintegrowane z budynkiem mogą znajdować się na wysokości do 25 m. Powyżej tej wysokości projekt dopuszcza je wyłącznie w budynku wyposażonym w stałe samoczynne urządzenia gaśnicze wodne.",
  legal: ["§ 308 projektu WT (projekt z 9.06.2025 r.) – urządzenia fotowoltaiczne zintegrowane z budynkiem"],
  verified: true
},
{
  id: 1007, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), falownik instalacji fotowoltaicznej umieszcza się na zewnątrz budynku lub w pomieszczeniu nieprzeznaczonym na pobyt ludzi, w odległości co najmniej 2 m od elementu budynku wykonanego z materiałów o klasie reakcji na ogień:",
  options: { a: "innej niż A1 lub A2, d0", b: "innej niż B-s1, d0", c: "D-s2, d0 i niższej" },
  answer: "a",
  explanation: "Falownik ma być oddalony o co najmniej 2 m od elementu budynku z materiałów o klasie reakcji na ogień innej niż A1 lub A2, d0. Ponadto ściana w miejscu montażu falownika i w odległości 2 m od niego ma być wykonana z materiałów A1 lub A2, d0 albo mieć taką okładzinę.",
  legal: ["§ 305 ust. 1 i 2 projektu WT (projekt z 9.06.2025 r.) – usytuowanie falownika"],
  verified: true
},
{
  id: 1008, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), przewód instalacji fotowoltaicznej po stronie prądu stałego prowadzi się na zewnątrz budynku. Prowadzenie go wewnątrz budynku jest dopuszczalne, jeżeli jest on umieszczony w osłonie lub obudowie o klasie odporności ogniowej co najmniej:",
  options: { a: "EI 30 we wszystkich budynkach", b: "EI 30 w budynkach, o których mowa w § 224 projektu, a EI 60 w pozostałych przypadkach", c: "EI 60 we wszystkich budynkach" },
  answer: "b",
  explanation: "Projekt różnicuje wymaganie: EI 30 dla budynków wymienionych w § 224 (m.in. jednorodzinne i wybrane budynki do 2–3 kondygnacji, zwolnione z wymagań klasy odporności pożarowej) oraz EI 60 w pozostałych przypadkach.",
  legal: ["§ 303 ust. 1 i 2 projektu WT (projekt z 9.06.2025 r.) – prowadzenie przewodów DC"],
  verified: true
},
{
  id: 1009, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), instalację fotowoltaiczną wyposaża się w co najmniej następujące środki ochrony:",
  options: { a: "urządzenie do monitorowania stanu izolacji po stronie prądu stałego oraz urządzenie do wykrywania zwarć łukowych", b: "wyłącznie urządzenie różnicowoprądowe (RCD) po stronie prądu przemiennego", c: "wyłącznie ogranicznik przepięć oraz bezpiecznik topikowy po stronie prądu stałego" },
  answer: "a",
  explanation: "Projekt wymaga wyposażenia instalacji fotowoltaicznej w urządzenie do monitorowania stanu izolacji po stronie prądu stałego oraz urządzenie do wykrywania zwarć łukowych.",
  legal: ["§ 305 ust. 3 projektu WT (projekt z 9.06.2025 r.)"],
  verified: true
},
{
  id: 1010, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), w pomieszczeniu z akumulatorami, w którym może wydzielać się gaz palny stwarzający atmosferę wybuchową, urządzenia detekcyjne po przekroczeniu stężenia progowego 10 % dolnej granicy wybuchowości mają:",
  options: { a: "odłączyć akumulatory od źródeł zasilania", b: "uruchomić sygnalizację alarmową i wentylację zapewniającą dwukrotne zwiększenie liczby wymian powietrza", c: "uruchomić stałe urządzenie gaśnicze gazowe" },
  answer: "b",
  explanation: "Projekt przewiduje dwa progi: przy 10 % DGW — sygnalizacja alarmowa i wentylacja zapewniająca dwukrotne zwiększenie liczby wymian powietrza w stosunku do warunków normalnej pracy; przy 30 % DGW — odłączenie akumulatorów od źródeł zasilania do czasu rozcieńczenia atmosfery.",
  legal: ["§ 311 ust. 2 projektu WT (projekt z 9.06.2025 r.) – magazyny energii, progi detekcji"],
  verified: true
},
{
  id: 1011, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), w pomieszczeniu z akumulatorami przekroczenie progu 30 % dolnej granicy wybuchowości gazu palnego powoduje:",
  options: { a: "wyłącznie uruchomienie sygnalizacji alarmowej", b: "odłączenie akumulatorów od źródeł zasilania do czasu rozcieńczenia atmosfery poniżej dopuszczalnego stężenia gazu", c: "zamknięcie klap przeciwpożarowych w instalacji wentylacyjnej" },
  answer: "b",
  explanation: "Po przekroczeniu 30 % DGW urządzenia detekcyjne mają odłączyć akumulatory od źródeł zasilania do czasu rozcieńczenia atmosfery poniżej dopuszczalnego stężenia gazu.",
  legal: ["§ 311 ust. 2 pkt 2 projektu WT (projekt z 9.06.2025 r.)"],
  verified: true
},
{
  id: 1012, isNew: true, source: "projekt WT 2025",
  category: "Fotowoltaika i magazyny energii",
  q: "Zgodnie z projektem nowych warunków technicznych (projekt z 9.06.2025 r.), w budynku, w którym jednym ze źródeł energii elektrycznej jest akumulatorowy system magazynowania energii, wymagany jest wyłącznik awaryjny przeznaczony dla ekip ratowniczych. W budynku wyposażonym w przeciwpożarowy wyłącznik prądu:",
  options: { a: "funkcję wyłącznika awaryjnego pełni przeciwpożarowy wyłącznik prądu", b: "należy zainstalować dodatkowy, odrębny wyłącznik awaryjny magazynu energii", c: "wyłącznik awaryjny nie jest wymagany, a magazyn energii odłącza się ręcznie w rozdzielnicy głównej" },
  answer: "a",
  explanation: "Projekt wprost przesądza, że w budynku wyposażonym w przeciwpożarowy wyłącznik prądu funkcję wyłącznika awaryjnego magazynu energii pełni ten wyłącznik. Wyłącznik lokalizuje się w miejscu projektowanego dostępu dla ekip ratowniczych.",
  legal: ["§ 310 ust. 1–3 projektu WT (projekt z 9.06.2025 r.) – wyłącznik awaryjny magazynu energii"],
  verified: true
},

/* ---------- B. AKTY OBOWIĄZUJĄCE – pytania w stylu lat poprzednich ---------- */
{
  id: 1013, isNew: true, source: "akty obowiązujące",
  category: "Ewakuacja",
  q: "W jednokondygnacyjnym budynku produkcyjnym, stanowiącym jedną strefę pożarową PM o gęstości obciążenia ogniowego 900 MJ/m², w pomieszczeniu o wysokości w świetle 7 m, wyposażonym w stałe samoczynne urządzenie gaśnicze tryskaczowe, maksymalna dopuszczalna długość przejścia ewakuacyjnego wynosi:",
  options: { a: "150 m", b: "175 m", c: "200 m" },
  answer: "b",
  explanation: "Dla strefy PM w budynku jednokondygnacyjnym podstawowa długość przejścia wynosi 100 m (bez względu na gęstość obciążenia ogniowego). Powiększenia sumują się: +25 % za pomieszczenie o wysokości ponad 5 m oraz +50 % za stałe samoczynne urządzenie gaśnicze wodne. Wynik: 100 m × (1 + 0,25 + 0,50) = 175 m.",
  legal: ["§ 237 WT – długość przejścia ewakuacyjnego i dopuszczalne powiększenia"],
  verified: true
},
{
  id: 1014, isNew: true, source: "akty obowiązujące",
  category: "Ewakuacja",
  q: "W pomieszczeniu o wysokości w świetle 4 m, znajdującym się w strefie pożarowej zakwalifikowanej do kategorii zagrożenia ludzi ZL III, chronionym stałym samoczynnym urządzeniem gaśniczym tryskaczowym, maksymalna dopuszczalna długość przejścia ewakuacyjnego wynosi:",
  options: { a: "50 m", b: "60 m", c: "70 m" },
  answer: "b",
  explanation: "Podstawowa długość przejścia w strefie ZL wynosi 40 m. Powiększenie o 25 % przysługuje tylko przy wysokości pomieszczenia przekraczającej 5 m — tu wysokość 4 m, więc nie przysługuje. Pozostaje +50 % za urządzenie tryskaczowe: 40 m × 1,5 = 60 m.",
  legal: ["§ 237 WT – długość przejścia ewakuacyjnego"],
  verified: true
},
{
  id: 1015, isNew: true, source: "akty obowiązujące",
  category: "Ewakuacja",
  q: "Łączna szerokość drzwi w świetle, stanowiących wyjścia ewakuacyjne z pomieszczenia przeznaczonego do jednoczesnego przebywania 300 osób, powinna wynosić co najmniej:",
  options: { a: "1,2 m", b: "1,8 m", c: "2,4 m" },
  answer: "b",
  explanation: "Łączną szerokość drzwi oblicza się proporcjonalnie do liczby osób, przyjmując co najmniej 0,6 m na 100 osób: 300 / 100 × 0,6 m = 1,8 m. Niezależnie od tego najmniejsza szerokość pojedynczych drzwi w świetle ościeżnicy wynosi 0,9 m.",
  legal: ["§ 239 WT – szerokość drzwi stanowiących wyjścia ewakuacyjne"],
  verified: true
},
{
  id: 1016, isNew: true, source: "akty obowiązujące",
  category: "Drogi pożarowe i dojazd",
  q: "Najmniejszy promień łuku drogi pożarowej, mierzony zgodnie z przepisami o przeciwpożarowym zaopatrzeniu w wodę oraz drogach pożarowych, nie może być mniejszy niż:",
  options: { a: "9 m, mierzony do wewnętrznej krawędzi drogi", b: "11 m, mierzony do zewnętrznej krawędzi drogi", c: "15 m, mierzony do osi drogi" },
  answer: "b",
  explanation: "Przepisy odnoszą minimalny promień łuku do zewnętrznej krawędzi drogi pożarowej i ustalają go na co najmniej 11 m.",
  legal: ["§ 12 RW – parametry drogi pożarowej (promień zewnętrznej krawędzi łuku)"],
  verified: true
},
{
  id: 1017, isNew: true, source: "akty obowiązujące",
  category: "Ewakuacja",
  q: "Zgodnie z Polską Normą PN-EN 1838 dotyczącą oświetlenia awaryjnego, awaryjne oświetlenie ewakuacyjne na drodze ewakuacyjnej powinno osiągnąć 50 % wymaganego natężenia oświetlenia w czasie nie dłuższym niż 5 s, a pełne wymagane natężenie (100 %) w czasie nie dłuższym niż:",
  options: { a: "10 s", b: "30 s", c: "60 s" },
  answer: "c",
  explanation: "Norma wymaga osiągnięcia 50 % wymaganego natężenia oświetlenia w ciągu 5 s oraz 100 % w ciągu 60 s. Na drodze ewakuacyjnej średnie natężenie w centralnym pasie podłogi wynosi co najmniej 1 lx.",
  legal: ["PN-EN 1838 – oświetlenie awaryjne, czasy osiągania natężenia"],
  verified: true
},
{
  id: 1018, isNew: true, source: "akty obowiązujące",
  category: "Pozostałe / ogólne",
  q: "Zgodnie z rozporządzeniem w sprawie ochrony przeciwpożarowej budynków, innych obiektów budowlanych i terenów, materiałem niebezpiecznym pożarowo jest ciecz palna o temperaturze zapłonu:",
  options: { a: "poniżej 328,15 K (55 °C)", b: "poniżej 373,15 K (100 °C)", c: "poniżej 423,15 K (150 °C)" },
  answer: "a",
  explanation: "Definicja materiałów niebezpiecznych pożarowo obejmuje ciecze palne o temperaturze zapłonu poniżej 328,15 K (55 °C). Ciecz o wyższej temperaturze zapłonu nie jest zaliczana do tej kategorii.",
  legal: ["§ 2 RPB – definicja materiałów niebezpiecznych pożarowo"],
  verified: true
},
{
  id: 1019, isNew: true, source: "akty obowiązujące",
  category: "Zagrożenie wybuchem",
  q: "Podczas oceny zagrożenia wybuchem strefę zagrożenia wybuchem wyznacza się w pomieszczeniu, w którym może wystąpić mieszanina wybuchowa o objętości co najmniej:",
  options: { a: "0,01 m³ (10 dm³) w zwartej przestrzeni", b: "0,1 m³ (100 dm³) w zwartej przestrzeni", c: "1 m³ w zwartej przestrzeni" },
  answer: "a",
  explanation: "Strefę zagrożenia wybuchem wyznacza się, jeżeli może w pomieszczeniu wystąpić mieszanina wybuchowa o objętości co najmniej 0,01 m³ (10 dm³) w zwartej przestrzeni.",
  legal: ["§ 37 RPB – ocena zagrożenia wybuchem i wyznaczanie stref"],
  verified: false
},
{
  id: 1020, isNew: true, source: "akty obowiązujące",
  category: "Zagrożenie wybuchem",
  q: "W przestrzeni zagrożonej wybuchem sklasyfikowanej jako strefa 2 mogą być stosowane urządzenia grupy II kategorii:",
  options: { a: "wyłącznie 1", b: "wyłącznie 2", c: "1, 2 lub 3" },
  answer: "c",
  explanation: "Strefie 2 odpowiada kategoria 3 urządzeń, przy czym dopuszczalne jest również stosowanie urządzeń kategorii wyższych (1 i 2), zapewniających wyższy poziom zabezpieczenia.",
  legal: ["dyrektywa ATEX 2014/34/UE – kategorie urządzeń a strefy zagrożenia wybuchem"],
  verified: true
},
{
  id: 1021, isNew: true, source: "akty obowiązujące",
  category: "Stałe urządzenia gaśnicze (tryskacze, gazowe, mgłowe)",
  q: "Natężenie wypływu wody z pojedynczego tryskacza oblicza się na podstawie zależności Q = K·√p. Oznacza to, że dwukrotne zwiększenie ciśnienia przed tryskaczem spowoduje zwiększenie wydatku o:",
  options: { a: "około 41 %", b: "dokładnie 100 %", c: "około 200 %" },
  answer: "a",
  explanation: "Wydatek jest proporcjonalny do pierwiastka z ciśnienia. Przy dwukrotnym wzroście ciśnienia wydatek rośnie √2 ≈ 1,41 razy, czyli o około 41 %, a nie dwukrotnie.",
  legal: ["PN-EN 12845 – wydatek tryskacza (współczynnik wypływu K)"],
  verified: true
},
{
  id: 1022, isNew: true, source: "akty obowiązujące",
  category: "Ewakuacja",
  q: "Korytarz stanowiący drogę ewakuacyjną w strefie pożarowej ZL, o długości 120 m, niewyposażony w rozwiązania techniczno-budowlane zapobiegające zadymieniu, należy podzielić na odcinki nie dłuższe niż:",
  options: { a: "30 m, przegrodami z drzwiami przeciwpożarowymi EI 30", b: "50 m, przegrodami z drzwiami dymoszczelnymi", c: "75 m, przegrodami z drzwiami przeciwpożarowymi EI 60" },
  answer: "b",
  explanation: "Korytarze stanowiące drogę ewakuacyjną w strefach ZL i PM, dłuższe niż 50 m, dzieli się na odcinki nie dłuższe niż 50 m przegrodami z drzwiami dymoszczelnymi. Obowiązek nie dotyczy korytarzy wyposażonych w rozwiązania zapobiegające zadymieniu.",
  legal: ["§ 256 WT – podział korytarzy stanowiących drogi ewakuacyjne"],
  verified: true
},
{
  id: 1023, isNew: true, source: "akty obowiązujące",
  category: "Instalacje wodne, hydranty, zaopatrzenie w wodę",
  q: "Dla budynku produkcyjnego wymagana ilość wody do zewnętrznego gaszenia pożaru wynosi 25 dm³/s, względny czas trwania pożaru 4 godziny, a wydajność wodociągu 10 dm³/s. Uzupełniający zapas wody w przeciwpożarowym zbiorniku wodnym powinien wynosić co najmniej:",
  options: { a: "144 m³", b: "216 m³", c: "360 m³" },
  answer: "b",
  explanation: "Deficyt wydajności wynosi 25 − 10 = 15 dm³/s. Przez 4 godziny (14 400 s) daje to 15 × 14 400 = 216 000 dm³, czyli 216 m³.",
  legal: ["§ 6–9 RW / PN-B-02857 – zapas wody (wzór obliczeniowy nie jest podany wprost w rozporządzeniu)"],
  verified: false
},
{
  id: 1024, isNew: true, source: "akty obowiązujące",
  category: "Ewakuacja",
  q: "Drzwi stanowiące wyjście ewakuacyjne z pomieszczenia powinny otwierać się na zewnątrz pomieszczenia, jeżeli jest ono przeznaczone do jednoczesnego przebywania:",
  options: { a: "ponad 20 osób", b: "ponad 50 osób", c: "ponad 100 osób" },
  answer: "b",
  explanation: "Na zewnątrz otwierają się drzwi z pomieszczenia przeznaczonego do jednoczesnego przebywania ponad 50 osób, a także z pomieszczenia zagrożonego wybuchem oraz z pomieszczeń dla ponad 6 osób o ograniczonej zdolności poruszania się.",
  legal: ["§ 236 WT – kierunek otwierania drzwi ewakuacyjnych"],
  verified: true
}

];
