async function run() {
  const daysOfWeekToIgnore = [0, 6]; // Sunday and Saturday
  const stationsToIgnore = ["Fruit & Vegetable Bar", "Milk & Condiments"];
  const today = new Date();
  const lunchCall = await fetch(
    `https://edinaschools.api.nutrislice.com/menu/api/weeks/school/countryside/menu-type/lunch/${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getDate().toString().padStart(2, "0")}/`,
  );
  const breakfastCall = await fetch(
    `https://edinaschools.api.nutrislice.com/menu/api/weeks/school/countryside/menu-type/breakfast/${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getDate().toString().padStart(2, "0")}/`,
  );

  const finalResults = [];

  const transformApiResponse = (response) => {
    return response.days.map((dayData) => {
      return {
        date: dayData.date,
        stations: dayData.menu_items.reduce((acc, menu_item) => {
          // Stations do not have a category
          if (
            menu_item.category === "" &&
            menu_item.station_id &&
            !stationsToIgnore.includes(menu_item.text)
          ) {
            acc.push({
              id: menu_item.station_id,
              name: menu_item.text,
              entrees: [],
              sides: [],
              image: undefined,
            });
          } else {
            // Find the station for this entree
            const station = acc.find((s) => s.id === menu_item.station_id);
            if (station && menu_item.food) {
              if (menu_item.category === "entree") {
                if (!station.image) {
                  station.image = menu_item.food.image_url;
                }
                station.entrees.push(menu_item.food.name);
              } else {
                station.sides.push(menu_item.food.name);
              }
            }
          }
          return acc;
        }, []),
      };
    });
  };

  if (lunchCall.ok) {
    const lunchData = (await lunchCall.json());

    const lunchMenu = transformApiResponse(lunchData);

    lunchMenu.forEach((day) => {
      if (!daysOfWeekToIgnore.includes(new Date(day.date).getUTCDay())) {
        finalResults.push({
          date: day.date,
          lunch: day.stations,
          breakfast: [],
        });
      }
    });
  }

  if (breakfastCall.ok) {
    const breakfastData = (await breakfastCall.json());

    const breakfastMenu = transformApiResponse(breakfastData);

    breakfastMenu.forEach((day) => {
      if (!daysOfWeekToIgnore.includes(new Date(day.date).getUTCDay())) {
        const existingDay = finalResults.find((d) => d.date === day.date);
        if (existingDay) {
          existingDay.breakfast = day.stations;
        } else {
          finalResults.push({
            date: day.date,
            lunch: [],
            breakfast: day.stations,
          });
        }
      }
    });
  }

  return finalResults;
}