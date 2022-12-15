$(function ()
{
    let searchInputEl = $("#searchInput");
    let previousSectionEl = $("#previous-section .row");
    let currentSectionEl = $("#current-section");
    let futureSectionEl = $("#future-section .row");

    let key = "c5e58c696459f0778b73495efecc2d5c";
    let userCoords;

    $(window).resize(function () { changeMobileSize() });
    $(window).ready(function () { changeMobileSize() });

    // Called on load and resize events
    function changeMobileSize()
    {
        if ($(window).width() < 768)
        {
            //Tablet and smaller
            $("#search-bar").insertAfter("#media-icons");
            $("#previous-section").insertAfter("#future-section");
            futureSectionEl.children(".card").width("4rem");
            $("#future-section .card .card-body").attr("class", "fs-6");
            currentSectionEl.children(".card").width("25rem");
            $("h2").css("fontSize", "100px");
        } else
        {
            $("#search-bar").insertBefore("#media-icons");
            $("#previous-section").insertBefore("#future-section");
            futureSectionEl.children(".card").width("10rem");
            currentSectionEl.children(".card").width("30rem")
            $("h2").css("fontSize", "120px");
        }
    }

    // Called on load - If provided the coords will be used to calculate distance between the user and the returned weather locations
    function getUserCoords()
    {
        // Use the users coords as an initial search | to get closest location
        if (navigator.geolocation)
        {
            navigator.geolocation.getCurrentPosition(function (position)
            {
                $.ajax({
                    url: `http://api.openweathermap.org/geo/1.0/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&limit=${1}&appid=${key}`,
                    method: "GET",
                    success: function (data)
                    {
                        userCoords = data[0];
                    }
                });
            });
        }
    }

    function requestLocation(value)
    {
        let url = (`https://api.openweathermap.org/geo/1.0/direct?q=${value},US&limit=5&appid=${key}`);

        $.ajax({
            url: url,
            method: "GET",
        }).then(function (response)
        {
            // Default to the first of the 5 results. Then IF the user agreed to provide their location select the closest location
            let closestLocation = response[0];
            if (userCoords)
            {
                let closestDistance = Infinity;
                for (let i = 0; i < response.length; i++)
                {
                    let distance = getDistance(userCoords.lat, response[i].lat, userCoords.lon, response[i].lon);
                    if (distance < closestDistance)
                    {
                        closestDistance = distance;
                        closestLocation = response[i];
                    }
                }
            }

            return closestLocation;
        }).then(function (data)
        {
            setLocalStorage(data);
            requestForecast(data);
        });
    }

    // Get the distance between two positions
    function getDistance(lat1, lat2, lon1, lon2)
    {
        // The math module contains a function
        // named toRadians which converts from
        // degrees to radians.
        lon1 = lon1 * Math.PI / 180;
        lon2 = lon2 * Math.PI / 180;
        lat1 = lat1 * Math.PI / 180;
        lat2 = lat2 * Math.PI / 180;

        // Haversine formula
        let dlon = lon2 - lon1;
        let dlat = lat2 - lat1;
        let a = Math.pow(Math.sin(dlat / 2), 2)
            + Math.cos(lat1) * Math.cos(lat2)
            * Math.pow(Math.sin(dlon / 2), 2);

        let c = 2 * Math.asin(Math.sqrt(a));

        // Radius of earth in kilometers. Use 3956
        // for miles
        let r = 3956;

        // calculate the result
        return (c * r);
    }

    // Gets current forecast
    function requestForecast(obj)
    {
        // Arr = [<current forecast>, <future forecast>]
        urls = [
            `https://api.openweathermap.org/data/2.5/weather?lat=${obj.lat}&lon=${obj.lon}&appid=${key}&units=imperial`,
            `https://api.openweathermap.org/data/2.5/forecast?lat=${obj.lat}&lon=${obj.lon}&appid=${key}&units=imperial`,
        ];

        for (let i = 0; i < urls.length; i++)
        {
            $.ajax({
                url: urls[i],
                method: "GET",
            }).then(function (response)
            {
                constructForecastObject(obj, response)
            })
        }
    }

    // Creates an object from the weather data
    function constructForecastObject(obj1, obj2)
    {
        let forecastArr = []
        let el;

        // If a list is included then its a 5day/3hour forecast else its the current forecast
        if (obj2.list)
        {
            let highTemp = 0;
            let lowTemp = Infinity;
            let todaysDate = dayjs().format("DD");

            // The api call returns 40 forecasts in 3 hour increments spanning across 5 days but I only need a single
            // forecast for each day.This forloop iterates through each object comparing the dates and pushing the first
            // forecast that matches a different date.
            for (let i = 0; i < obj2.list.length && forecastArr.length < 5; i++)
            {
                // The first object is pushed so we start the loop at index of 1. Now compare the current index with the
                // previous and retain the first instance of a new date. The dates are formatted "YYYY-MM-DD hh:mm:ss" -
                // First split on the space which returns an array of 1. Next split the one index by the tac('-') = ['YYYY', 'MM', 'DD']
                let currentIndexDate = (obj2.list[i].dt_txt.split(" ", 1))[0].split("-", 3)[2];

                if (currentIndexDate == todaysDate)
                {
                    continue;
                }

                if (forecastArr.length < 1)
                {
                    highTemp = obj2.list[i].main.temp_max;
                    lowTemp = obj2.list[i].main.temp_min;
                    forecastArr.push(obj2.list[i]);
                    continue;
                }

                let previousIndexDate = (obj2.list[i - 1].dt_txt.split(" ", 1))[0].split("-", 3)[2];


                // Grab the highest and lowest temp in the range of forecast for one day
                if (obj2.list[i].main.temp_max > highTemp)
                {
                    highTemp = obj2.list[i].main.temp_max;
                }
                if (obj2.list[i].main.temp_min < lowTemp)
                {
                    lowTemp = obj2.list[i].main.temp_min;
                }

                // Compare just the date
                if (currentIndexDate != previousIndexDate)
                {
                    obj2.list[i].main.temp_max = highTemp;
                    obj2.list[i].main.temp_min = lowTemp;
                    forecastArr.push(obj2.list[i]);
                }
            }

            el = futureSectionEl;
        } else
        {
            forecastArr.push(obj2);
            el = currentSectionEl;
        }

        // Clear the element of children before displaying updated cards
        el.empty();

        // Now loop through the array of forecasts building a forecast object
        for (let i = 0; i < forecastArr.length; i++)
        {
            let weatherObj = {
                name: (obj1.name == null) ? "" : obj1.name,
                state: (obj1.state == null) ? "" : obj1.state,
                temp: Math.round(forecastArr[i].main.temp),
                hiTemp: Math.round(forecastArr[i].main.temp_max),
                loTemp: Math.round(forecastArr[i].main.temp_min),
                realFeel: Math.round(forecastArr[i].main.feels_like),
                humidity: Math.round(forecastArr[i].main.humidity),
                windSpeed: Math.round(forecastArr[i].wind.speed),
                windDirection: getCardinalDirection(forecastArr[i].wind.deg),
                date: dayjs(forecastArr[i].dt_txt, "YYYY-MM-DD").format("MMM DD, 2022"),
                day: dayjs(forecastArr[i].dt_txt, "YYYY-MM-DD").format("dddd"),
                iconLabel: forecastArr[i].weather[0].main,
                icon: getWeatherIcon(forecastArr[i].weather[0].main),
            }

            // Each iteration send the html element, forecast object, and current index to the displayForecast function
            displayForecast(el, weatherObj, i);
        }
    }

    // Converts angle to directions
    function getCardinalDirection(angle)
    {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return directions[Math.round(angle / 45) % 8];
    }

    // Gets the weather icon and background image associate with weather type
    function getWeatherIcon(value)
    {
        let iconBG;
        let icon = value;

        switch (value)
        {
            case "Clear":
                icon = "./assets/images/sun.gif";
                iconBG = "./assets/images/clear.jpg"
                break;
            case "Clouds":
                icon = "./assets/images/clouds.gif";
                iconBG = "./assets/images/clouds.jpg"
                break;
            case "Rain":
                icon = "./assets/images/rain.gif";
                iconBG = "./assets/images/rain.jpg"
                break;
            case "Thunderstorm":
                icon = "./assets/images/storm.gif";
                iconBG = "./assets/images/storm.jpg"
                break;
            case "Snow":
                icon = "./assets/images/snow.gif";
                iconBG = "./assets/images/snow.jpg"
                break;
            default:
                icon = "./assets/images/foggy.gif";
                iconBG = "./assets/images/mist.jpg"
        }

        return [icon, iconBG];
    }

    // Takes the element to append to and an array of forecast objects (just blank objects for now)
    function displayForecast(el, obj, index)
    {
        if (el === currentSectionEl)
        {
            $("#current").css("background-image", `url(${obj.icon[1]}`);
            $("#current").css("background-size", "cover");

            // Build Current Weather Card
            el.append(
                $("<div>", { "class": "card d-inline-flex m-2 shadow" }).append(
                    $("<div>", { "id": "day-card-text", "class": "card-body" }).append(
                        $("<div>", { "class": "row" }).append(
                            $("<div>", { "class": "col-6" }).append(
                                $("<h5>").text(`${obj.name}`),
                                $("<h6>").text(`${obj.state}`)
                            ),
                            $("<div>", { "class": "col-6 text-center" }).append(
                                $("<p>").text(`${obj.date}`)
                            )
                        ),
                        $("<div>", { "class": "row" }).append(
                            $("<div>", { "class": "col-6 fw-bold" }).append(
                                $("<h2>").text(`${obj.temp}\u00B0`),
                                $("<p>").append(
                                    $("<span>", { "class": "fs-5 text-danger fw-bold" }).text(`\u25B2${obj.hiTemp}\u00B0\xa0`),
                                    $("<span>", { "class": "fs-5 text-info fw-bold" }).text(`\u25BC${obj.loTemp}\u00B0`)
                                )
                            ),
                            $("<div>", { "class": "col-6" }).append(
                                $("<img>", { "class": "w-100", "src": `${obj.icon[0]}`, "alt": `${obj.iconLabel}` }),
                                $("<figcaption>", { "class": "fs-5 text-center" }).text(`${obj.iconLabel}`)
                            )
                        ),
                        $("<div>", { "class": "row mx-1 mt-1" }).append(
                            $("<div>", { "class": "col" }).append(
                                $("<p>").text(`Real Feel: ${obj.realFeel}\u00B0`),
                                $("<p>").text(`Wind: ${obj.windSpeed} mph ${obj.windDirection}`),
                                $("<p>").text(`Humidity: ${obj.humidity}\u0025`)
                            )
                        )
                    ),
                )
            );
        } else
        {
            // Build 5-day Weather Card
            el.append(
                $("<div>", { "class": "card d-inline-flex m-1 text-center shadow" }).append(
                    $("<div>", { "id": "day-card-" + index, "class": "card-body" }).append(
                        $("<img>", { "class": "w-100", "src": `${obj.icon[0]}`, "alt": `${obj.iconLabel}` }),
                        $("<p>", { "id": "day-of-week", "class": "text-nowrap overflow-hidden" }).text(`${obj.day}`),
                        $("<p>").append(
                            $("<span>", { "class": "fs-5 text-danger fw-bold" }).text(`${obj.hiTemp}\u00B0\xa0`),
                            $("<span>", { "class": "fs-5 text-info fw-bold" }).text(`${obj.loTemp}\u00B0`)
                        ),
                        $("<p>").append(
                            $("<span>", { "class": "fs-6 fw-semibold" }).text(`${obj.windSpeed}m\\h ${obj.windDirection}`)
                        ),
                        $("<p>").append(
                            $("<span>", { "class": "fs-6 fw-semibold" }).text(`${obj.humidity}\u0025\xa0`)
                        )
                    )
                )
            )
        }
    }

    // Creates the clickable buttons for recent searches
    function displayRecentSearch()
    {
        let previousSearch = getLocalStorage();
        // Reverse the order of the array for display purposes
        previousSearch = previousSearch.reverse();

        // Clear current child buttons
        previousSectionEl.empty();

        previousSectionEl.append($("<p>", { "class": "card-title text-center fs-5" }).text("Recent Search"));
        // Create and append updated buttons
        previousSearch.forEach(element =>
        {
            previousSectionEl.append($("<button type='button' class='col-4 col-lg-12 btn btn-outline-secondary text-start shadow my-1'>").text(`${element}`));
        });
    }

    // Takes the click event from recent searches
    function getRecentSearch(event)
    {
        let eventText = event.target.textContent;
        requestLocation(eventText);
    }

    function getLocalStorage()
    {
        let storage = JSON.parse(localStorage.getItem("recentSearches"));
        return storage;
    }

    function setLocalStorage(obj)
    {
        // Only need city and state names saved
        // Clear any null or undefined values   
        let tmpValue = (obj.name == null) ? "" : obj.name;
        tmpValue += (obj.state == null) ? "" : ", " + obj.state;
        let storage = JSON.parse(localStorage.getItem("recentSearches"));

        if (storage)
        {
            // If city/state already exists in localStorage then remove the duplicate from storage
            if (storage.includes)
            {
                storage = storage.filter(function (e) { return e !== tmpValue })
            }
            // If the localStorage has 5(cap) elements then remove the top element
            if (storage.length > 5)
            {
                storage.shift();
            }

            storage.push(tmpValue);
        } else
        {
            storage = [tmpValue];
        }

        localStorage.setItem("recentSearches", JSON.stringify(storage));
        displayRecentSearch();
    }

    function loadDefaultContent()
    {
        // Attempt to get user coords
        getUserCoords();
        // Get localStorage and preload a search from recent searches, or the users coords, or a basic U.S. search 
        let previousSearch = getLocalStorage();
        if (previousSearch)
        {
            requestLocation(previousSearch.at(-1))
        } else if (userCoords)
        {
            requestLocation(userCoords.name + ", " + userCoords.state);
        } else
        {
            requestLocation("United States");
        }
    }

    previousSectionEl.on("click", getRecentSearch);
    searchInputEl.on("keypress", function (event)
    {
        let keycode = event.keycode || event.which;
        let value = event.target.value.trim();
        if (keycode == "13" && value > "")
        {
            requestLocation(value);
            searchInputEl.val("");
        }
    });

    loadDefaultContent();
});