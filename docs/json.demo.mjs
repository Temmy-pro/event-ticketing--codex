const event = {id: "event1", title: "Lagos event", city: "Lagos", date: "2023-06-15", tiers: ["General", "VIP"]};

const text =JSON.stringify(event);

console.log(text);
console.log(JSON.parse(text));