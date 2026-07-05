// Jaartal in de footer automatisch invullen
document.getElementById("year").textContent = new Date().getFullYear();

// Contactformulier: simpele client-side afhandeling.
// Er is geen backend gekoppeld, dus we tonen alleen een bevestiging.
const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();

  if (!name || !email || !message) {
    status.textContent = "Vul alle velden in.";
    return;
  }

  // Hier zou je normaal gesproken de gegevens naar een server sturen,
  // bijvoorbeeld met fetch() naar een API endpoint of formulierdienst.
  status.textContent = `Bedankt ${name}! Je bericht is (lokaal) ontvangen.`;
  form.reset();
});
