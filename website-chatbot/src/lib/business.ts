// Edit this file to make the chatbot about YOUR business.
export const business = {
  name: "Acme Coffee Co.",
  tagline: "Ask us anything about our coffee, orders and shop.",
  greeting: "Hi! I'm the Acme Coffee assistant. How can I help you today?",
  suggestions: [
    "What are your opening hours?",
    "Do you ship internationally?",
    "Which beans are best for espresso?",
  ],
  // Everything the bot should know. Plain text is fine.
  knowledge: `
Hours: Mon-Fri 7am-6pm, Sat-Sun 8am-4pm. Address: 123 Main St, Springfield.
Shipping: Free US shipping over $40. International shipping to Canada, UK and EU, $15 flat.
Returns: Unopened bags can be returned within 30 days for a full refund.
Products: House Blend (medium, $16), Midnight Espresso (dark, $18, best for espresso),
Ethiopia Yirgacheffe (light, fruity, $20), Decaf Swiss Water ($17).
Subscriptions: Save 10% with a subscription, delivered every 2 or 4 weeks; cancel anytime.
Contact: hello@acmecoffee.example or (555) 123-4567.
`,
};

export const systemPrompt = `You are the friendly customer-support assistant for ${business.name}.
Answer using only the information below. If the answer isn't there, say you don't know
and suggest contacting the team. Keep answers short and helpful.

<business_info>
${business.knowledge}
</business_info>`;
