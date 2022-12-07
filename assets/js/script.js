$(window).resize(function () { changeMobileSize() });
$(window).ready(function () { changeMobileSize() });

function changeMobileSize() {
    if ($(window).width() < 992) {
        //Tablet and smaller
        $("#search-bar").insertAfter("#media-icons");

    } else {
        $("#search-bar").insertBefore("#media-icons");
    }

}