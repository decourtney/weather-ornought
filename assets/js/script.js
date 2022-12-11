$(function ()
{
    let searchInputEl = $("#searchInput");
    let previousSectionEl = $("#previous-section");
    let currentSectionEl = $("#current-section");
    let dayTabEl = $("#tabs-5day");

    let key = "c5e58c696459f0778b73495efecc2d5c";
    let userCoords;
    let recentSearches = [];

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
        if (navigator.geolocation)
        {
            navigator.geolocation.getCurrentPosition(function (position)
            {
                userCoords = position;
                console.log(userCoords);
            });
        }
    }

    function requestLocation(value)
    {
        let url = ("https://api.openweathermap.org/geo/1.0/direct?q=" + value + ",US&limit=5&appid=" + key);

        // Might have to use first .then to handle errors
        $.ajax({
            url: url,
            method: "GET",
        }).then(function (response)
        {
            let closestLocation = response[0];
            if (userCoords)
            {
                let closestDistance = Infinity;
                for (let i = 0; i < response.length; i++)
                {
                    let distance = getDistance(userCoords.coords.latitude, response[i].lat, userCoords.coords.longitude, response[i].lon);
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
            recentSearches.push(data.name + ", " + data.state)
            localStorage.setItem("recentSearches", JSON.stringify(recentSearches));

            requestForecast(data);
            console.log(data);
        });
    }

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
                // Compare just the date
                if (currentDate[2] != previousDate[2])
                {
                    forecastArr.push(obj2.list[i]);
                }
            };

            el = dayTabEl;
        } else
        {
            forecastArr.push(obj2);
            el = currentSectionEl;
        }

        // Now loop through the array of forecasts building a forecast object
        for (let i = 0; i < forecastArr.length; i++)
        {
            let obj = {
                name: obj1.name,
                state: obj1.state,
                temp: forecastArr[i].main.temp,
                hiTemp: forecastArr[i].main.temp_max,
                loTemp: forecastArr[i].main.temp_min,
                realFeel: forecastArr[i].main.feels_like,
                humidity: forecastArr[i].main.humidity,
                windSpeed: forecastArr[i].wind.speed,
                windDirection: forecastArr[i].wind.deg,
                icon: forecastArr[i].weather[0].main,
            }

            // Each iteration send the html element, forecast object, and current index to the displayForecast function
            displayForecast(el, obj, i);
            console.log(obj);
        }
    }

    // Takes the element to append to and an array of forecast objects (just blank objects for now)
    function displayForecast(el, obj, index)
    {
        el.append(
            $("<div>", { "class": "card d-inline-flex" }).append(
                $("<div>", { "id": "day-card-" + index, "class": "card-body" }).append(
                    $("<h5>", { "class": "card-title" }).text(`${obj.name}`),
                    $("<h6>", { "class": "card-subtitle" }).text(`${obj.state}`),
                    $("<h2>", { "class": "card-subtitle" }).text(`${obj.temp}`),
                    $("<p>", { "class": "card-text" }).text(`${obj.hiTemp}`),
                    $("<p>", { "class": "card-text" }).text(`${obj.loTemp}`),
                    $("<p>", { "class": "card-text" }).text(`${obj.icon}`),
                    $("<p>", { "class": "card-text" }).text(`${obj.realFeel}`),
                    $("<p>", { "class": "card-text" }).text(`${obj.windSpeed}`),
                    $("<p>", { "class": "card-text" }).text(`${obj.windDirection}`),
                    $("<p>", { "class": "card-text" }).text(`${obj.humidity}`),
                )
            )
        );
    }

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

    // displayForecast(dayTabEl, [1, 2, 3, 4, 5]); /* Temp placement for building/testing */
    // displayWeatherCards(previousSectionEl, [1]);
    // displayForecast(currentSectionEl, [1]);
    getUserCoords();
});

