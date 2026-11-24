window.SHOWCASE = {
  headline:
    "For a sample user it planned breakfast, lunch and dinner: 1,860 kcal and 162 g of protein, using the chicken that expires first in two of the meals.",
  blocks: [
    {
      type: "table",
      title: "Today's plan it generated",
      columns: ["Meal", "Recipe", "Calories", "Protein"],
      rows: [
        ["Breakfast", "Chia cups in 4 flavors", "466 kcal", "22 g"],
        ["Lunch", "Stuffed chicken meatballs", "666 kcal", "72 g"],
        ["Dinner", "Mexican chicken and corn salad", "728 kcal", "68 g"]
      ]
    },
    {
      type: "stats",
      title: "Against the daily goal",
      items: [
        { label: "Calories", value: "1,860 / 2,000", tone: "good" },
        { label: "Protein", value: "162 g / 150 g", tone: "good" },
        { label: "Recipes to choose from", value: 285, tone: "info" }
      ]
    },
    {
      type: "cards",
      title: "What was in the pantry",
      caption: "Items that expire soonest are used first.",
      items: [
        { title: "Chicken breast", subtitle: "500 g", badge: "2 days left", tone: "warn" },
        { title: "Spinach", subtitle: "200 g", badge: "5 days left", tone: "warn" },
        { title: "Avocado", subtitle: "2 units", badge: "5 days left", tone: "warn" },
        { title: "Eggs", subtitle: "12 units", badge: "30 days left", tone: "good" },
        { title: "Rice", subtitle: "1 kg", badge: "180 days left", tone: "good" },
        { title: "Oats", subtitle: "500 g", badge: "180 days left", tone: "good" }
      ]
    }
  ]
};
