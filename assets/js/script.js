$(function ()
{
    let searchInputEl = $("#searchInput");
    let previousSectionEl = $("#previous-section");
    let currentSectionEl = $("#current-section");
    let dayTabEl = $("#tabs-5day");

    let key = "c5e58c696459f0778b73495efecc2d5c";

    $(window).resize(function () { changeMobileSize() });
    $(window).ready(function () { changeMobileSize() });
    $(function () { $("#future-section").tabs(); });

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

    function sendRequest(requestURL)
    {
        return $.ajax({
            url: requestURL,
            method: "GET"
        })
    }

    // probably going to rename because this will handle all the requests
    function getLatLong(value)
    {
        let requestURL = "http://api.openweathermap.org/geo/1.0/direct?q=" + value + ",US&limit=5&appid=" + key;
        let latLong = sendRequest(requestURL);
        console.log(latLong);
    }

    // Takes the element to append to and an array of forecast objects (just blank objects for now)
    function displayWeatherCards(el, cards)
    {
        for (let i = 0; i < cards.length; i++)
        {
            el.append(
                $("<div>", { "class": "card d-inline-flex" }).append(
                    $("<div>", { "id": "day-card-" + i, "class": "card-body" }).append(
                        $("<h5>", { "class": "card-title" }).text("Card Title"),
                        $("<h6>", { "class": "card-subtitle" }).text("Card Subtitle"),
                        $("<p>", { "class": "card-text" }).text("Card Text")
                    )
                )
            );
        }
    }

    searchInputEl.on("keypress", function (event)
    {
        let keycode = event.keycode || event.which;
        let value = event.target.value.trim();
        if (keycode == "13" && value > "")
        {
            getLatLong(value);
            searchInputEl.val("");
        }
    });

    displayWeatherCards(dayTabEl, [1, 2, 3, 4, 5]); /* Temp placement for building/testing */
    displayWeatherCards(previousSectionEl, [1]);
    displayWeatherCards(currentSectionEl, [1]);

});

