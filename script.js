// Jaartal in de footer automatisch invullen
document.getElementById("year").textContent = new Date().getFullYear();

// Zachte fade-in van secties bij het scrollen.
// De 'reveal'-klasse wordt alleen via JavaScript toegevoegd, zodat alles
// gewoon zichtbaar blijft als JavaScript uitstaat.
// De werkwijze-sectie doet niet mee: die animeert per blok (zie onderaan).
const revealSections = [...document.querySelectorAll("main section:not(#hero):not(#werkwijze)")];
revealSections.forEach((section) => section.classList.add("reveal"));

function revealOnScroll() {
  // Een sectie verschijnt zodra de bovenkant 80px boven de onderrand
  // van het scherm komt.
  const limit = window.innerHeight - 80;
  for (const section of revealSections) {
    if (section.getBoundingClientRect().top < limit) {
      section.classList.add("visible");
    }
  }
}

window.addEventListener("scroll", revealOnScroll, { passive: true });
revealOnScroll(); // ook direct bij het laden checken wat al in beeld is

// Werkwijze-blokken: fade-in + slide-up per blok via IntersectionObserver.
// De animatieklasse wordt hier pas gezet, zodat de blokken zonder
// JavaScript gewoon zichtbaar zijn.
const stapBlokken = [...document.querySelectorAll(".stap-blok")];
stapBlokken.forEach((blok) => blok.classList.add("stap-animatie"));

const stapObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add("zichtbaar");
      stapObserver.unobserve(entry.target); // eenmalig animeren is genoeg
    }
  }
}, { rootMargin: "0px 0px -80px 0px" });

stapBlokken.forEach((blok) => stapObserver.observe(blok));

// ---------------------------------------------------------------
// Chatbot-demo: Kapsalon Demo
// Een gescript beslisboom-gesprek, puur JavaScript en geen AI-API.
// Elke stap van het gesprek staat hieronder uitgeschreven in "flow".
// ---------------------------------------------------------------
const chatMessages = document.getElementById("chat-messages");
const chatOptions = document.getElementById("chat-options");

if (chatMessages) {
  // Gekozen behandeling, dag en tijd onthouden voor het bevestigingsbericht
  const keuze = {};

  // De hoofdmenu-opties worden op meerdere plekken hergebruikt
  const hoofdmenu = [
    { label: "Openingstijden", next: "openingstijden" },
    { label: "Prijzen", next: "prijzen" },
    { label: "Afspraak maken", next: "afspraakBehandeling" },
    { label: "Veelgestelde vragen", next: "faqMenu" },
  ];

  // Dagopties op basis van de echte datum, zodat de demo actueel voelt.
  // Zondag en maandag is de kapsalon dicht, die worden overgeslagen.
  function komendeDagen() {
    const namen = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
    const opties = [];
    const datum = new Date();
    while (opties.length < 3) {
      datum.setDate(datum.getDate() + 1);
      if (datum.getDay() !== 0 && datum.getDay() !== 1) {
        opties.push({ label: `${namen[datum.getDay()]} ${datum.getDate()}`, bewaar: "dag", next: "afspraakTijd" });
      }
    }
    return opties;
  }

  const flow = {
    start: {
      tekst: "Hoi! 👋 Ik ben de digitale assistent van Kapsalon Demo. Waarmee kan ik je helpen?",
      opties: hoofdmenu,
    },
    menu: {
      tekst: "Waarmee kan ik je verder helpen?",
      opties: hoofdmenu,
    },
    openingstijden: {
      tekst: "We zijn open van dinsdag t/m zaterdag van 9:00 tot 17:30. Op vrijdag is er koopavond tot 21:00. Zondag en maandag zijn we gesloten.",
      doorNaar: "verder",
    },
    prijzen: {
      tekst: "Knippen €32,50 · Wassen, knippen en föhnen €42,50 · Kleuren vanaf €65. Kinderen tot 12 jaar knippen we voor €19,50.",
      doorNaar: "verder",
    },
    afspraakBehandeling: {
      tekst: "Leuk! Welke behandeling wil je boeken?",
      opties: [
        { label: "Knippen", bewaar: "behandeling", next: "afspraakDag" },
        { label: "Wassen + knippen", bewaar: "behandeling", next: "afspraakDag" },
        { label: "Kleuren", bewaar: "behandeling", next: "afspraakDag" },
      ],
    },
    afspraakDag: {
      tekst: "Op welke dag komt het je uit?",
      opties: komendeDagen,
    },
    afspraakTijd: {
      tekst: "Deze tijden zijn dan nog vrij:",
      opties: [
        { label: "10:00", bewaar: "tijd", next: "afspraakBevestiging" },
        { label: "13:30", bewaar: "tijd", next: "afspraakBevestiging" },
        { label: "15:45", bewaar: "tijd", next: "afspraakBevestiging" },
      ],
    },
    afspraakBevestiging: {
      tekst: () => `Genoteerd! ${keuze.behandeling} op ${keuze.dag} om ${keuze.tijd} uur. ✅ Normaal krijg je nu direct een bevestiging per mail en staat de afspraak in de agenda van de zaak.`,
      doorNaar: "cta",
    },
    faqMenu: {
      tekst: "Vraag maar raak:",
      opties: [
        { label: "Kan ik zonder afspraak langskomen?", next: "faqZonderAfspraak" },
        { label: "Knippen jullie ook kinderen?", next: "faqKinderen" },
        { label: "Waar kan ik parkeren?", next: "faqParkeren" },
      ],
    },
    faqZonderAfspraak: {
      tekst: "Dat kan, maar zeker op zaterdag is het druk. Een afspraak maken kost 30 seconden — dan weet je zeker dat je meteen geholpen wordt.",
      doorNaar: "verder",
    },
    faqKinderen: {
      tekst: "Jazeker, kinderen zijn welkom! Tot 12 jaar knippen we voor €19,50.",
      doorNaar: "verder",
    },
    faqParkeren: {
      tekst: "Voor de deur is een blauwe zone: 2 uur gratis met parkeerschijf. De parkeergarage om de hoek kost €1,50 per uur.",
      doorNaar: "verder",
    },
    verder: {
      tekst: "Kan ik nog iets voor je doen?",
      opties: [
        { label: "Ja, graag", next: "menu" },
        { label: "Nee, bedankt", next: "afsluiting" },
      ],
    },
    afsluiting: {
      tekst: "Fijne dag! 👋 En onthoud: dit gesprek kostte de eigenaar nul minuten.",
      doorNaar: "cta",
    },
    cta: {
      tekst: "Dit voor jouw bedrijf? Zo'n assistent bouw ik ook voor jouw klanten — met jouw prijzen, jouw agenda en jouw huisstijl.",
      opties: [
        { label: "Plan een gratis kennismaking", actie: "contact" },
        { label: "↺ Begin opnieuw", next: "start" },
      ],
    },
  };

  function scrollNaarOnderen() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Bot-bericht met typindicator: eerst even "..." tonen, dan de tekst.
  // De vertraging groeit een beetje mee met de lengte van het bericht.
  function botZegt(tekst) {
    return new Promise((klaar) => {
      const typing = document.createElement("div");
      typing.className = "chat-typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      chatMessages.appendChild(typing);
      scrollNaarOnderen();

      const vertraging = 500 + Math.min(tekst.length * 6, 700);
      setTimeout(() => {
        typing.remove();
        const bubbel = document.createElement("div");
        bubbel.className = "chat-bubble bot";
        bubbel.textContent = tekst;
        chatMessages.appendChild(bubbel);
        scrollNaarOnderen();
        klaar();
      }, vertraging);
    });
  }

  function gebruikerZegt(tekst) {
    const bubbel = document.createElement("div");
    bubbel.className = "chat-bubble user";
    bubbel.textContent = tekst;
    chatMessages.appendChild(bubbel);
    scrollNaarOnderen();
  }

  async function toonNode(id) {
    const node = flow[id];
    const tekst = typeof node.tekst === "function" ? node.tekst() : node.tekst;
    await botZegt(tekst);

    // Sommige stappen lopen direct door naar een volgend bericht
    if (node.doorNaar) {
      toonNode(node.doorNaar);
      return;
    }

    const opties = typeof node.opties === "function" ? node.opties() : node.opties;
    toonOpties(opties);
  }

  function toonOpties(opties) {
    chatOptions.innerHTML = "";
    opties.forEach((optie) => {
      const knop = document.createElement("button");
      knop.type = "button";
      knop.className = "chat-option";
      knop.textContent = optie.label;
      knop.addEventListener("click", () => {
        gebruikerZegt(optie.label);
        if (optie.bewaar) keuze[optie.bewaar] = optie.label;
        chatOptions.innerHTML = "";

        if (optie.actie === "contact") {
          document.getElementById("contact").scrollIntoView({ behavior: "smooth" });
          return;
        }
        toonNode(optie.next);
      });
      chatOptions.appendChild(knop);
    });
  }

  toonNode("start");
}

// Contactformulier: verzenden naar Formspree zonder pagina-herlaad.
// Het action-attribuut in de HTML dient als fallback wanneer JavaScript uitstaat.
const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");
const submitBtn = form.querySelector("button[type=submit]");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();

  if (!name || !email || !message) {
    status.textContent = "Vul alle velden in.";
    status.classList.add("error");
    return;
  }

  // Knop tijdelijk uitschakelen zodat het formulier niet dubbel verzonden wordt
  submitBtn.disabled = true;
  status.classList.remove("error");
  status.textContent = "Bezig met verzenden...";

  try {
    const response = await fetch(form.action, {
      method: "POST",
      headers: { "Accept": "application/json" },
      body: new FormData(form),
    });

    if (response.ok) {
      status.textContent = `Bedankt ${name}! Je bericht is verzonden — ik reageer binnen 24 uur.`;
      form.reset();
    } else {
      status.textContent = "Er ging iets mis bij het verzenden. Probeer het later opnieuw of mail me direct.";
      status.classList.add("error");
    }
  } catch {
    // fetch faalt bijvoorbeeld als er geen internetverbinding is
    status.textContent = "Verzenden mislukt. Controleer je internetverbinding en probeer het opnieuw.";
    status.classList.add("error");
  } finally {
    submitBtn.disabled = false;
  }
});
