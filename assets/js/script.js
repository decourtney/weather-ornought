$(function ()
{
    let searchInputEl = $("#searchInput");
    let previousSectionEl = $("#previous-section .card-body");
    let currentSectionEl = $("#current-section");
    let dayTabEl = $("#tabs-5day .row");
    let futureCardEl = $("#tabs-5day");

    let key = "c5e58c696459f0778b73495efecc2d5c";
    let userCoords;

    $(window).resize(function () { changeMobileSize() });
    $(window).ready(function () { changeMobileSize() });
    $(function () { $("#future-section").tabs(); });

    // Called on load and resize events
    function changeMobileSize()
    {
        if ($(window).width() < 992)
        {
            //Tablet and smaller
            $("#search-bar").insertAfter("#media-icons");

        } else
        {
            $("#search-bar").insertBefore("#media-icons");
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
                    method: "GET"
                }).then(function (response)
                {
                    userCoords = response[0];
                    console.log(userCoords);
                })
            });
        }
    }

    function requestLocation(value)
    {
        let url = (`https://api.openweathermap.org/geo/1.0/direct?q=${value},US&limit=5&appid=${key}`);

        // Might have to use first .then to handle errors
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
            console.log(data);
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
                console.log(response);
                constructForecastObject(obj, response)
            })
        }
    }


    function constructForecastObject(obj1, obj2)
    {
        let forecastArr = []
        let el;
        let highTemp = 0;
        let lowTemp = Infinity;

        // If a list is included then its a 5day/3hour forecast else its the current forecast
        if (obj2.list)
        {
            // The api call returns 40 forecasts in 3 hour increments spanning across 5 days but I only need a single
            // forecast for each day. This forloop iterates through each object comparing the dates and pushing the first
            // forecast that matches a different date.
            forecastArr.push(obj2.list[0])
            for (let i = 1; i < obj2.list.length && forecastArr.length < 5; i++)
            {
                // The first object is pushed so we start the loop at index of 1. Now compare the current index with the
                // previous and retain the first instance of a new date. The dates are formatted "YYYY-MM-DD hh:mm:ss" - 
                // First split on the space which returns an array of 1. Next split the one index by the tac('-') = ['YYYY', 'MM', 'DD']
                let currentDate = (obj2.list[i].dt_txt.split(" ", 1))[0].split("-", 3);
                let previousDate = (obj2.list[i - 1].dt_txt.split(" ", 1))[0].split("-", 3);

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
                if (currentDate[2] != previousDate[2])
                {
                    forecastArr.push(obj2.list[i]);
                }
            };

            el = dayTabEl;
        } else
        {
            highTemp = obj2.main.temp_max;
            lowTemp = obj2.main.temp_min;
            forecastArr.push(obj2);
            el = currentSectionEl;
            console.log(obj2)
        }

        // Clear the element of children before displaying updated cards
        el.empty();

        // Now loop through the array of forecasts building a forecast object
        for (let i = 0; i < forecastArr.length; i++)
        {
            let obj = {
                name: obj1.name,
                state: obj1.state,
                temp: Math.round(forecastArr[i].main.temp),
                hiTemp: Math.round(highTemp),
                loTemp: Math.round(lowTemp),
                realFeel: Math.round(forecastArr[i].main.feels_like),
                humidity: Math.round(forecastArr[i].main.humidity),
                windSpeed: Math.round(forecastArr[i].wind.speed),
                windDirection: getCardinalDirection(forecastArr[i].wind.deg),
                day: dayjs(forecastArr[i].dt_txt, "YYYY-MM-DD").format("dddd"),
                iconLabel: forecastArr[i].weather[0].main,
                icon: getWeatherIcon(forecastArr[i].weather[0].main)
            }

            // Each iteration send the html element, forecast object, and current index to the displayForecast function
            displayForecast(el, obj, i);
            console.log(obj);
        }
    }

    function getCardinalDirection(angle)
    {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return directions[Math.round(angle / 45) % 8];
    }

    function getWeatherIcon(value)
    {
        switch (value)
        {
            case "Clear":
                value = "./assets/images/sun.gif";
                break;
            case "Clouds":
                value = "./assets/images/clouds.gif";
                break;
            case "Rain":
                value = "./assets/images/rain.gif";
                break;
            case "Thunderstorm":
                value = "./assets/images/storm.gif";
                break;
            case "Snow":
                value = "./assets/images/snow.gif";
                break;
            case "Mist":
                value = "./assets/images/foggy.gif";
        }

        return value;
    }

    // Takes the element to append to and an array of forecast objects (just blank objects for now)
    function displayForecast(el, obj, index)
    {
        if (el === currentSectionEl)
        {
            // Build Current Weather Card
            el.append(
                $("<div>", { "class": "card d-inline-flex" }).append(
                    $("<div>", { "id": "day-card-text", "class": "card-body" }).append(
                        $("<h5>").text(`${obj.name}`),
                        $("<h6>").text(`${obj.state}`),
                        $("<div>", { "class": "row" }).append(
                            $("<div>", { "class": "col-6 fw-bold" }).append(
                                $("<h2>").text(`${obj.temp}\u00B0`),
                                $("<p>").append(
                                    $("<span>", { "class": "material-symbols-outlined fs-5" }).text(`\u25B2${obj.hiTemp}\u00B0\xa0`),
                                    $("<span>", { "class": "material-symbols-outlined fs-5" }).text(`\u25BC${obj.loTemp}\u00B0`)
                                )
                            ),
                            $("<div>", { "class": "col-6" }).append(
                                $("<img>", { "class": "w-100", "src": `${obj.icon}`, "alt": "Rain Cloud" }),
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
                $("<div>", { "class": "card d-inline-flex col-2 m-1 text-center" }).append(
                    $("<div>", { "id": "day-card-" + index, "class": "card-body" }).append(
                        $("<img>", { "class": "w-100", "src": `${obj.icon}`, "alt": "Rain Cloud" }),
                        $("<p>").text(`${obj.day}`),
                        $("<p>").append(
                            $("<span>", { "class": "material-symbols-outlined fs-5" }).text(`${obj.hiTemp}\u00B0\xa0`),
                            $("<span>", { "class": "material-symbols-outlined fs-5" }).text(`${obj.loTemp}\u00B0`)
                        )
                    )
                )
            )
        }
    }

    function displayRecentSearch()
    {
        let previousSearch = getLocalStorage();
        previousSearch = previousSearch.reverse();

        // Clear current child buttons
        previousSectionEl.empty();

        // Create and append updated buttons
        previousSearch.forEach(element =>
        {
            previousSectionEl.append($("<button type='button' class='btn btn-outline-secondary text-start'>").text(`${element}`));
        });
    }

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
        let tmpValue = obj.name + ", " + obj.state;
        let storage = JSON.parse(localStorage.getItem("recentSearches"));

        if (storage)
        {
            // If city/state already exists in localStorage then remove the duplicate from storage
            if (storage.includes)
            {
                storage = storage.filter(function (e) { return e !== tmpValue })
            }
            // If the localStorage has 5(cap) elements then remove the top element
            if (storage.length > 4)
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

    getUserCoords();
    loadDefaultContent();
});